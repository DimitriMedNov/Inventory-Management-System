

## Plan: Agregar botón "Restablecer contraseña" en gestión de usuarios

### Resumen
Se añadirá un botón de "Restablecer contraseña" por cada usuario en la tabla de gestión, incluyendo la cuenta propia del admin. Al hacer clic, se abrirá un diálogo donde el admin ingresa la nueva contraseña y se envía al servidor usando la función `resetUserPasswordAdmin` que ya existe.

### Cambios

**Archivo: `src/routes/usuarios.tsx`**

1. **Importar** `resetUserPasswordAdmin` desde `@/utils/users.functions` (ya exporta esa función) y el icono `KeyRound` de lucide-react.
2. **Agregar estado** `pendingResetUser` para rastrear qué usuario está siendo editado y un estado `resetOpen` para el diálogo.
3. **Agregar botón** "Contraseña" en la columna de acciones de cada fila (junto al botón Activar/Desactivar). Este botón estará habilitado para todos los usuarios, incluyendo el propio admin.
4. **Crear componente `ResetPasswordDialog`** con:
   - Campo de nueva contraseña (tipo text para visibilidad, mínimo 8 caracteres).
   - Botón de confirmar que llama a `resetUserPasswordAdmin` con el `user_id` y la nueva contraseña, pasando el token de sesión en los headers.
   - Mensajes de éxito/error con toast.
5. **Actualizar la nota** al pie para reflejar que sí puede restablecer su propia contraseña.

**Archivo: `src/utils/users.functions.ts`** — Sin cambios, `resetUserPasswordAdmin` ya existe y funciona.

### Seguridad
- La función `resetUserPasswordAdmin` ya verifica que el llamador sea admin via `assertCallerIsAdmin`.
- Se marca el hallazgo de seguridad `hardcoded_admin_pwd` como corregido una vez implementado, dado que el admin podrá rotar la contraseña desde la UI.

