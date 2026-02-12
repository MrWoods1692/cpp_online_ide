// 文件管理器 - 使用IndexedDB存储
class FileManager {
    constructor() {
        this.db = null;
        this.dbName = 'CodeIDE';
        this.dbVersion = 1;
        this.storeName = 'files';
        this.currentFile = null;
        this.files = [];
        this.pinnedFiles = new Set();
        
        this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                // 只在开发环境下显示日志
                if (window.location.hostname === 'localhost') {
                    console.error('IndexedDB打开失败:', request.error);
                }
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.loadFiles().then(resolve);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    objectStore.createIndex('name', 'name', { unique: false });
                    objectStore.createIndex('modified', 'modified', { unique: false });
                }
            };
        });
    }

    async loadFiles() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                setTimeout(() => this.loadFiles().then(resolve).catch(reject), 100);
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                this.files = request.result || [];
                // 加载置顶文件列表
                const pinned = localStorage.getItem('pinnedFiles');
                if (pinned) {
                    this.pinnedFiles = new Set(JSON.parse(pinned));
                }
                resolve(this.files);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async saveFile(id, name, content, language = 'cpp') {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }

            // 查找原文件
            const existingFile = this.files.find(f => f.id === id);
            
            // 检查文件名是否重复（仅在创建新文件时）
            if (!id && this.checkFileNameExists(name)) {
                reject(new Error('文件名已存在'));
                return;
            }
            
            // 只有当文件内容真正变化时才更新modified时间戳
            let modifiedTime = Date.now();
            if (existingFile && existingFile.content === content && existingFile.name === name && existingFile.language === language) {
                modifiedTime = existingFile.modified;
            }

            const file = {
                id: id || this.generateId(),
                name: name || 'untitled.cpp',
                content: content || '',
                language: language,
                modified: modifiedTime,
                created: existingFile ? existingFile.created : Date.now()
            };

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(file);

            request.onsuccess = () => {
                const index = this.files.findIndex(f => f.id === file.id);
                if (index >= 0) {
                    this.files[index] = file;
                } else {
                    this.files.push(file);
                }
                resolve(file);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async deleteFile(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                this.files = this.files.filter(f => f.id !== id);
                this.pinnedFiles.delete(id);
                this.savePinnedFiles();
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getFile(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async renameFile(id, newName) {
        const file = await this.getFile(id);
        if (!file) {
            throw new Error('文件不存在');
        }
        return await this.saveFile(id, newName, file.content, file.language);
    }

    generateId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    togglePin(id) {
        if (this.pinnedFiles.has(id)) {
            this.pinnedFiles.delete(id);
        } else {
            this.pinnedFiles.add(id);
        }
        this.savePinnedFiles();
    }

    savePinnedFiles() {
        localStorage.setItem('pinnedFiles', JSON.stringify(Array.from(this.pinnedFiles)));
    }

    isPinned(id) {
        return this.pinnedFiles.has(id);
    }

    searchFiles(query) {
        if (!query) {
            return this.getSortedFiles();
        }
        const lowerQuery = query.toLowerCase();
        return this.getSortedFiles().filter(file => 
            file.name.toLowerCase().includes(lowerQuery)
        );
    }

    getSortedFiles() {
        return [...this.files].sort((a, b) => {
            const aPinned = this.isPinned(a.id);
            const bPinned = this.isPinned(b.id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return b.modified - a.modified;
        });
    }

    async importLocalFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const fileName = file.name;
                    const id = this.generateId();
                    
                    // 检查文件名是否重复
                    const exists = this.checkFileNameExists(fileName);
                    if (exists) {
                        // 如果文件名重复，添加时间戳后缀
                        const baseName = fileName.replace(/\.[^/.]+$/, '');
                        const ext = fileName.substring(fileName.lastIndexOf('.'));
                        const newFileName = `${baseName}_${Date.now()}${ext}`;
                        const importedFile = await this.saveFile(id, newFileName, content);
                        resolve(importedFile);
                    } else {
                        const importedFile = await this.saveFile(id, fileName, content);
                        resolve(importedFile);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            reader.readAsText(file);
        });
    }

    checkFileNameExists(name, excludeId = null) {
        return this.files.some(file => file.name === name && file.id !== excludeId);
    }

    async renameFile(id, newName) {
        // 检查新文件名是否重复
        if (this.checkFileNameExists(newName, id)) {
            throw new Error('文件名已存在');
        }
        
        const file = await this.getFile(id);
        if (!file) {
            throw new Error('文件不存在');
        }
        return await this.saveFile(id, newName, file.content, file.language);
    }
}

// 导出供其他模块使用
window.FileManager = FileManager;
