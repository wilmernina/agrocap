import {describe,expect,it} from 'vitest';
import {haceDias,hoy} from './dates';

describe('fechas de filtros',()=>{
  it('produce fechas ISO cortas en horario Bolivia',()=>expect(hoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  it('calcula un periodo anterior',()=>expect(haceDias(30)<=hoy()).toBe(true));
});
