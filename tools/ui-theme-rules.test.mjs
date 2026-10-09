import { describe,it,expect } from 'vitest'
import { Linter } from 'eslint'
import { uiRules } from './ui-theme-rules.mjs'
const lint=(source,filename='src/features/Example.tsx')=>new Linter().verify(source,[{files:['**/*.tsx'],languageOptions:{ecmaVersion:2022,sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}}},plugins:{ui:uiRules},rules:{'ui/canonical-controls':'error'}}],{filename})
describe('UI lint enforcement',()=>{
 it('rejects raw search and accepts canonical internals',()=>{expect(lint('const x=<input type="search"/>')).toHaveLength(1);expect(lint('const x=<input type="search"/>','src/components/SearchInput/SearchInput.tsx')).toHaveLength(0)})
 it('rejects duplicate Back and removal without banning normal buttons',()=>{expect(lint('const x=<button>Back to Actions</button>')).toHaveLength(1);expect(lint('const x=<button>X</button>')).toHaveLength(1);expect(lint('const x=<button>Reset</button>')).toHaveLength(0)})
 it('rejects browser confirmation and permits scoped dismissals',()=>{expect(lint('window.confirm("Delete?")')).toHaveLength(1);expect(lint('const x=<button>×</button>','src/components/Toast/Toast.tsx')).toHaveLength(0)})
})
