#include <iostream>
using namespace std;

int main() {
    int a, b;
    cout << "请输入两个整数，用空格分隔：" << endl;
    while (cin >> a >> b) {
        cout << "和为：" << a + b << endl;
        cout << "请输入两个整数，用空格分隔（输入Ctrl+D结束）：" << endl;
    }
    cout << "程序结束" << endl;
    return 0;
}