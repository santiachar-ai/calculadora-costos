# Deploy de la calculadora de costos

Objetivo: que una persona pueda usar la calculadora desde una URL sin instalar Node, clonar el repo ni levantar la API local.

## Modo recomendado inicial

Publicar el frontend `apps/web` y usar la calculadora con almacenamiento local del navegador:

- los Excel se procesan en el navegador
- parametros, reglas y ultimos archivos quedan en `localStorage`
- no se necesita backend para calcular
- la configuracion se puede mover entre maquinas con "Generar configuracion" e "Importar configuracion"

Variable sugerida:

```bash
NEXT_PUBLIC_COSTS_CONFIG_MODE=local
```

URL para compartir:

```text
/reportes/costos
```

## Deploy sugerido en Vercel

Opcion rapida:

[Deploy en Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsantiachar-ai%2FERP&project-name=calculadora-costos&root-directory=apps%2Fweb&env=NEXT_PUBLIC_COSTS_CONFIG_MODE&envDescription=Usar%20local%20para%20que%20la%20calculadora%20funcione%20sin%20backend&envLink=https%3A%2F%2Fgithub.com%2Fsantiachar-ai%2FERP%2Fblob%2Fmain%2Fdocs%2Fcalculadora-costos-deploy.md)

En el paso de variables, usar:

```bash
NEXT_PUBLIC_COSTS_CONFIG_MODE=local
```

Configuracion manual equivalente:

1. Conectar el repo `santiachar-ai/ERP`.
2. Configurar el proyecto con root directory `apps/web`.
3. Build command: `npm run build`.
4. Output: Next.js automatico.
5. Agregar variable `NEXT_PUBLIC_COSTS_CONFIG_MODE=local`.
6. Deployar y compartir la URL `/reportes/costos`.

## Limitaciones del modo local

- Cada usuario conserva sus reglas y archivos en su propio navegador.
- Si borra datos del navegador, pierde archivos y parametros locales.
- No hay configuracion central compartida.
- No hay usuarios ni permisos.

## Siguiente etapa

Para una version multiusuario:

1. Publicar la API.
2. Usar base de datos cloud.
3. Agregar login.
4. Guardar configuraciones por empresa o usuario.
5. Agregar plantillas de archivos esperados y validacion con mensajes mas guiados.
