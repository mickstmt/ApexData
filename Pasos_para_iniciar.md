Cada vez que vayas a trabajar:
cd c:\Users\Andree\Desktop\projects\node.js\apexdata
npm run dev
Cuando hagas cambios:
git add .
git commit -m "descripción clara de los cambios"
git push
Si cambias el schema de Prisma:
npx prisma generate
npx prisma db push