#include <iostream>

using namespace std;

// calculate Fibonacci sequence (recursive implementation, compute-intensive)
long long fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    // calculate the 40th term of Fibonacci sequence
    int n = 40;
    long long result = fibonacci(n);
    
    cout << "Fibonacci(" << n << ") = " << result << endl;
    
    return 0;
}
