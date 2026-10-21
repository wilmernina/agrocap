import{describe,expect,it}from'vitest';import{cn}from'./utils';describe('cn',()=>{it('resuelve clases Tailwind en conflicto',()=>expect(cn('px-2','px-4')).toBe('px-4'))});
