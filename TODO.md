# TODO - Corrección de Bugs de Sesión y Logout

## [x] 1. Corregir logout() en AuthContext
   - [x] Añadir importación de `useNavigate`
   - [x] Modificar `logout()` para borrar localStorage y resetear estado
   - [x] Añadir redirección a `/` tras logout

## [x] 2. Corregir estado inicial en Incógnito
   - [x] Cambiar estado inicial de `user` a `null` si no hay token
   - [x] Ajustar StorageService para devolver `null` cuando no hay datos

## [x] 3. Limpiar NavBar
   - [x] Eliminar `useNavigate` y `navigate("/")` redundante en handleLogout (logout() ya redirige internamente)

## [x] 4. Verificar build
   - [x] Build compilado exitosamente sin errores

