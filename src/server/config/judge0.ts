export interface LanguageConfig {
  id: number;
  name: string;
  extension: string;
  sampleCode: string;
}

export const JUDGE0_LANGUAGES: Record<string, LanguageConfig> = {
  python: {
    id: 71, // Python (3.8.1)
    name: 'Python 3',
    extension: 'py',
    sampleCode: '# Python 3 Code\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("CodeEase Learner"))\n',
  },
  javascript: {
    id: 63, // JavaScript (Node.js 12.14.0)
    name: 'JavaScript (Node.js)',
    extension: 'js',
    sampleCode: '// JavaScript Code\nfunction calculateFactorial(n) {\n  if (n <= 1) return 1;\n  return n * calculateFactorial(n - 1);\n}\n\nconsole.log(`Factorial of 5 is ${calculateFactorial(5)}`);\n',
  },
  c: {
    id: 50, // C (GCC 9.2.0)
    name: 'C (GCC)',
    extension: 'c',
    sampleCode: '#include <stdio.h>\n\nint main() {\n    printf("Welcome to CodeEase C Foundations!\\n");\n    return 0;\n}\n',
  },
  cpp: {
    id: 54, // C++ (GCC 9.2.0)
    name: 'C++ (GCC)',
    extension: 'cpp',
    sampleCode: '#include <iostream>\n\nint main() {\n    std::cout << "CodeEase C++ Precision Engine" << std::endl;\n    return 0;\n}\n',
  },
  java: {
    id: 62, // Java (OpenJDK 13.0.1)
    name: 'Java (OpenJDK)',
    extension: 'java',
    sampleCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from CodeEase Java Sandbox!");\n    }\n}\n',
  },
};
