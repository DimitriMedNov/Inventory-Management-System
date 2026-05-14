## Resetear contraseñas de las 3 cuentas

Voy a actualizar la contraseña de las 3 cuentas existentes a una contraseña conocida para que puedas entrar.

### Credenciales finales

| Rol | Correo | Contraseña |
|---|---|---|
| Admin / Super Admin | `sistemas.bajio@diprolam.com` | `Inventa2026!` |
| Almacén | `prueba@diprolam.com` | `Inventa2026!` |
| Solicitante | `buran.martinez@diprolam.com` | `Inventa2026!` |

### Cómo lo voy a hacer

Ejecutar una migración SQL que actualiza el campo `encrypted_password` en `auth.users` usando la función `crypt()` de Postgres con bcrypt, que es exactamente el mismo algoritmo que usa Supabase Auth internamente. Esto es seguro y reversible (puedes cambiar la contraseña tú mismo después de entrar).

```sql
UPDATE auth.users
SET encrypted_password = crypt('Inventa2026!', gen_salt('bf')),
    updated_at = now()
WHERE email IN (
  'sistemas.bajio@diprolam.com',
  'prueba@diprolam.com',
  'buran.martinez@diprolam.com'
);
```

### Después

- Vas a `/login` y entras con cualquiera de los 3 correos + `Inventa2026!`
- Te recomiendo cambiar las contraseñas desde la app después de entrar
- Las cuentas siguen ligadas a la empresa "Diprolam Bjx" (no se renombra nada)

### Lo que NO incluye este plan

- No crea cuentas nuevas
- No cambia correos
- No crea la empresa demo "Demo Corp" ni datos sembrados
- No toca branding ni roles

¿Apruebas?
