import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Leaf, LockKeyhole, Mail, ShieldCheck, Sprout } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Field, Input } from '../components/ui';
import { authService } from '../services/auth.service';
import { useAuth } from '../store/auth';

const loginSchema = z.object({
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});
type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const setSession = useAuth((state) => state.setSession);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: import.meta.env.DEV
      ? { email: 'admin@agrocap.bo', password: 'AgroSys2026!' }
      : { email: '', password: '' },
  });

  const ingresar = async (valores: LoginForm) => {
    try {
      const respuesta = await authService.login(valores);
      setSession(respuesta.data.user, respuesta.data.accessToken);
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'No se pudo iniciar sesión' });
    }
  };

  return <main className="min-h-screen bg-stone-50 lg:grid lg:grid-cols-[1.08fr_.92fr]">
    <section className="relative hidden min-h-screen overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col xl:p-16">
      <div className="absolute inset-0 opacity-40 login-grid" />
      <div className="absolute -left-24 bottom-16 size-80 rounded-full bg-lime-300/10 blur-3xl" />
      <div className="absolute -right-32 top-20 size-96 rounded-full border-[70px] border-emerald-300/[.05]" />

      <div className="relative flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-lime-300 text-brand-950"><Sprout size={24} /></span>
        <div><p className="font-display text-2xl font-extrabold">AgroCAP</p><p className="text-[10px] font-bold tracking-[.2em] text-emerald-200/60">GESTIÓN AGROPECUARIA</p></div>
      </div>

      <div className="relative my-auto max-w-2xl pb-10">
        <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-lime-300"><Leaf size={16} /> Información que cultiva resultados</p>
        <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight xl:text-6xl">Tu operación agrícola, clara y bajo control.</h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-emerald-50/70">Ventas, compras e inventario en una plataforma diseñada para el trabajo real del campo boliviano.</p>
      </div>

      <div className="relative flex items-center gap-3 text-sm text-emerald-100/65"><ShieldCheck size={19} className="text-lime-300" /> Acceso seguro con renovación automática de sesión</div>
    </section>

    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-md">
        <div className="mb-9 flex items-center gap-3 lg:hidden">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-800 text-white"><Sprout size={22} /></span>
          <span className="font-display text-2xl font-bold text-brand-950">AgroCAP</span>
        </div>

        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-600">Bienvenido de nuevo</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Ingresa a tu cuenta</h2>
          <p className="mt-3 text-sm leading-6 text-stone-500">Usa tus credenciales para acceder al módulo comercial.</p>
        </div>

        <form onSubmit={handleSubmit(ingresar)} className="space-y-5" noValidate>
          <Field label="Correo electrónico" error={errors.email?.message}>
            <div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={18} /><Input autoComplete="email" className="h-12 pl-11" type="email" placeholder="nombre@empresa.bo" {...register('email')} /></div>
          </Field>
          <Field label="Contraseña" error={errors.password?.message}>
            <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={18} /><Input autoComplete="current-password" className="h-12 px-11" type={mostrarPassword ? 'text' : 'password'} placeholder="Tu contraseña" {...register('password')} /><button type="button" onClick={() => setMostrarPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </Field>

          {errors.root && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{errors.root.message}</div>}
          <Button disabled={isSubmitting} className="h-12 w-full rounded-xl text-base">Ingresar a AgroCAP</Button>
        </form>

        {import.meta.env.DEV && <div className="mt-7 rounded-2xl border border-stone-200 bg-white p-4 text-xs text-stone-500 shadow-sm"><p className="font-semibold text-stone-700">Acceso local de prueba</p><p className="mt-1">admin@agrocap.bo · AgroSys2026!</p></div>}
        <p className="mt-8 text-center text-xs text-stone-400">AgroCAP · Santa Cruz, Bolivia</p>
      </div>
    </section>
  </main>;
}
