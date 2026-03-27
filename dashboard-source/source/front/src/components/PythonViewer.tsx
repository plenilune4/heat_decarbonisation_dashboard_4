import MonacoEditor from '@monaco-editor/react'
import { useEffect } from 'react'

export default function PythonViewer({
    code,
    path,
    extension,
    language,
    height,
}: {
    code: string
    path?: string
    extension?: string
    language?: string
    height?: string
}) {
    // Force dark mode for Monaco editor
    useEffect(() => {
        // This ensures the editor stays in dark mode even if system preferences change
        document.documentElement.classList.add('dark-mode')

        // Add a style tag to force dark backgrounds
        const style = document.createElement('style')
        style.textContent = `
            .monaco-editor, 
            .monaco-editor-background, 
            .monaco-editor .inputarea.ime-input {
                background-color: #1a1a1a !important;
            }
            .monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active,
            .monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab {
                background-color: #1a1a1a !important;
            }
        `
        document.head.appendChild(style)

        return () => {
            document.head.removeChild(style)
        }
    }, [])

    // Function to handle editor mounting
    function handleEditorDidMount(editor: any, monaco: any) {
        // Configure Python language features
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: true, // stop validating missing imports
            jsx: monaco.languages.typescript.JsxEmit.React,
            allowNonTsExtensions: true,
        })

        // Force dark mode for Monaco
        monaco.editor.setTheme('vs-dark')

        // Register Python-specific completions
        monaco.languages.registerCompletionItemProvider('python', {
            provideCompletionItems: (model: any, position: any) => {
                const suggestions = [
                    {
                        label: 'def',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'def ${1:function_name}(${2:parameters}):\n\t${3:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define a new function',
                    },
                    {
                        label: 'class',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'class ${1:ClassName}:\n\tdef __init__(self, ${2:parameters}):\n\t\t${3:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define a new class',
                    },
                    {
                        label: 'if',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'if ${1:condition}:\n\t${2:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'If statement',
                    },
                    {
                        label: 'for',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'For loop',
                    },
                    {
                        label: 'while',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'while ${1:condition}:\n\t${2:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'While loop',
                    },
                    {
                        label: 'try',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Try/except block',
                    },
                    {
                        label: 'import',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'import ${1:module}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Import a module',
                    },
                    {
                        label: 'from',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'from ${1:module} import ${2:name}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Import specific names from a module',
                    },
                    // Common Python libraries
                    {
                        label: 'numpy',
                        kind: monaco.languages.CompletionItemKind.Module,
                        insertText: 'import numpy as np',
                        documentation: 'Import NumPy library',
                    },
                    {
                        label: 'pandas',
                        kind: monaco.languages.CompletionItemKind.Module,
                        insertText: 'import pandas as pd',
                        documentation: 'Import Pandas library',
                    },
                    {
                        label: 'matplotlib',
                        kind: monaco.languages.CompletionItemKind.Module,
                        insertText: 'import matplotlib.pyplot as plt',
                        documentation: 'Import Matplotlib for plotting',
                    },
                ]
                return { suggestions }
            },
        })

        // Add Python indentation rules
        // (No-op in read-only mode)

        // Define a dark theme optimized for Python development
        monaco.editor.defineTheme('pythonDarkTheme', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                // Python-specific token colors with enhanced contrast
                { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
                { token: 'string', foreground: 'f1fa8c' }, // Bright yellow for strings
                { token: 'keyword', foreground: 'ff79c6' }, // Pink for keywords
                { token: 'number', foreground: 'bd93f9' }, // Purple for numbers
                { token: 'operator', foreground: 'ff79c6' }, // Pink for operators
                { token: 'delimiter', foreground: 'f8f8f2' }, // White for delimiters
                { token: 'type', foreground: '8be9fd' }, // Cyan for types
                { token: 'function', foreground: '50fa7b' }, // Green for functions
                { token: 'variable', foreground: 'f8f8f2' }, // White for variables
                { token: 'parameter', foreground: 'ffb86c' }, // Orange for parameters
                { token: 'builtin', foreground: '8be9fd' }, // Cyan for built-ins
                { token: 'decorator', foreground: '50fa7b', fontStyle: 'italic' }, // Green italics for decorators
                { token: 'constant', foreground: 'bd93f9' }, // Purple for constants
                { token: 'class', foreground: '8be9fd' }, // Cyan for class names
                { token: 'module', foreground: 'f1fa8c' }, // Yellow for module names
                { token: 'punctuation', foreground: 'f8f8f2' }, // White for punctuation
                { token: 'docstring', foreground: '6272a4', fontStyle: 'italic' }, // Blue-gray for docstrings
            ],
            colors: {
                // Dark theme colors with better contrast
                'editor.background': '#1a1a1a', // Darker background
                'editor.foreground': '#f8f8f2', // Light foreground for contrast
                'editorLineNumber.foreground': '#6272a4', // Subtle line numbers
                'editorLineNumber.activeForeground': '#f8f8f2', // Bright active line number
                'editor.selectionBackground': '#44475a', // Selection background
                'editor.selectionHighlightBackground': '#424450', // Selection highlight
                'editor.lineHighlightBackground': '#2c2c2c', // Subtle line highlight
                'editorCursor.foreground': '#f8f8f0', // Bright cursor
                'editorWhitespace.foreground': '#3B3A32', // Subtle whitespace markers
                'editorIndentGuide.background': '#3B3F51', // Subtle indent guides
                'editorIndentGuide.activeBackground': '#9D550F', // Highlighted active indent guide
                'editor.findMatchBackground': '#6272a480', // Find match with transparency
                'editor.findMatchHighlightBackground': '#6272a440', // Find match highlight with more transparency
                'editorOverviewRuler.border': '#1a1a1a', // Hide overview ruler border
                'editorHoverWidget.background': '#282a36', // Hover widget background
                'editorHoverWidget.border': '#6272a4', // Hover widget border
                'editorSuggestWidget.background': '#282a36', // Suggestion widget background
                'editorSuggestWidget.border': '#6272a4', // Suggestion widget border
                'editorSuggestWidget.selectedBackground': '#44475a', // Selected suggestion
                'editorWidget.background': '#21222c', // Widget background
                'editorWidget.border': '#6272a4', // Widget border
                'tab.activeBackground': '#282a36', // Active tab
                'tab.inactiveBackground': '#21222c', // Inactive tab
                'tab.activeForeground': '#f8f8f2', // Active tab text
                'tab.inactiveForeground': '#6272a4', // Inactive tab text
                'scrollbarSlider.background': '#44475a80', // Scrollbar with transparency
                'scrollbarSlider.hoverBackground': '#44475acc', // Scrollbar hover
            },
        })

        // Apply our custom dark theme
        monaco.editor.setTheme('pythonDarkTheme')

        // Force dark mode again after a short delay to ensure it applies
        setTimeout(() => {
            monaco.editor.setTheme('pythonDarkTheme')
        }, 100)
    }

    // Determine language based on extension or provided language prop
    const determineLanguage = () => {
        if (language) return language
        if (extension) {
            switch (extension.toLowerCase()) {
                case '.py':
                    return 'python'
                case '.js':
                    return 'javascript'
                case '.ts':
                    return 'typescript'
                case '.jsx':
                    return 'javascript'
                case '.tsx':
                    return 'typescript'
                case '.html':
                    return 'html'
                case '.css':
                    return 'css'
                case '.json':
                    return 'json'
                default:
                    return 'python' // Default to Python
            }
        }
        return 'python' // Default to Python if no extension or language provided
    }

    return (
        <div className='flex overflow-hidden flex-col flex-1 rounded-xl border border-gray-700'>
            <MonacoEditor
                value={code}
                language={determineLanguage()}
                defaultLanguage='python'
                theme='pythonDarkTheme'
                height={height ?? '700px'}
                options={{
                    fontSize: 16,
                    wordWrap: 'on',
                    tabSize: 4,
                    minimap: { enabled: false },
                    padding: {
                        top: 10,
                        bottom: 10,
                    },
                    autoIndent: 'full',
                    formatOnPaste: true,
                    formatOnType: true,
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'selection',
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    bracketPairColorization: { enabled: true },
                    guides: { bracketPairs: true },
                    cursorBlinking: 'solid',
                    cursorSmoothCaretAnimation: 'off',
                    smoothScrolling: true,
                    mouseWheelZoom: true,
                    fontLigatures: true,
                    readOnly: true,
                    cursorStyle: 'block',
                    renderLineHighlight: 'none',
                    renderLineHighlightOnlyWhenFocus: false,
                    selectionHighlight: false,
                    occurrencesHighlight: 'off',
                    hideCursorInOverviewRuler: true,
                }}
                beforeMount={(monaco) => {
                    // Set default theme to dark before mounting
                    monaco.editor.defineTheme('vs-dark-forced', {
                        base: 'vs-dark',
                        inherit: true,
                        rules: [],
                        colors: {
                            'editor.background': '#1a1a1a',
                            'editor.foreground': '#f8f8f2',
                        },
                    })
                    monaco.editor.setTheme('vs-dark-forced')
                }}
                onMount={handleEditorDidMount}
            />
        </div>
    )
}
