

import { useState } from "react";
import { useLogin } from "../hooks/useLogin";

export const Login = () => {

    const {logearUsuario} = useLogin()

    const [form, setForm] = useState({
        usuario: '',
        contrasena: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); 

        if (!form.usuario || !form.contrasena) return alert("Completa todos los campos");

        logearUsuario({
            usuario: form.usuario,
            contrasena: form.contrasena 
        });

    setForm({ usuario: '',
        contrasena: '', });
    };


    return (
        <div className='min-h-screen bg-gray-50 flex flex-col items-center p-10 relative'>
            

            <h1 className='text-4xl font-black text-gray-800 mb-8 tracking-tight'>
                Login
            </h1>

            <form className='flex flex-col gap-4 ' onSubmit={handleSubmit}>
                <div>
                  <label className='block '>
                    Usuario:
                  </label>
                  <input 
                    type="text" 
                    className='w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none' 
                    placeholder='Ej: PepitoXD'
                    value={form.usuario}
                    onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                    />
                </div>
                <div>
                  <label className='block '>
                    Descripcion:
                  </label>
                  <input 
                    type="password" 
                    className='w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none' 
                    placeholder='Ej: *********'
                    value={form.contrasena}
                    onChange={(e) => setForm({...form, contrasena: e.target.value})}
                    />
                </div>
                <button 
                  type='submit'
                  className="bg-blue-800 hover:bg-blue-950 tetx-white font-bold py-2 px-4 rounded-lg transition-all active:scale-95 shadow-md ">
                        Iniciar sesion
                </button>
                
                
            </form>
        </div>
    )
}
