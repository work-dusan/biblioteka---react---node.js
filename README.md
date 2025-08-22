Biblioteka – Web aplikacija za upravljanje knjigama

Ovaj projekat predstavlja sistem biblioteke sa tri nivoa korisnika (gost, korisnik, administrator) i podržava pregled, iznajmljivanje i upravljanje knjigama.
Frontend i backend su odvojeni i nalaze se u folderima biblioteka-frontend/ i biblioteka-backend/.

Tehnologije:

Frontend

React 18 + Vite – korisnički interfejs i brzi development server

Tailwind CSS – util-class stilizacija i responsive dizajn

React Router DOM – deklarativne rute i zaštićene stranice

Axios – HTTP komunikacija sa backend-om

React Context API – globalno stanje korisnika (auth, favorites)

Lucide ikone – ikonice u UI-ju

Backend:

Node.js + Express – REST API server

MongoDB + Mongoose – baza podataka

JWT (jsonwebtoken) – autentikacija i autorizacija

bcryptjs – hashiranje lozinki

Activity log – praćenje akcija korisnika i admina

Instalacija

1. Kloniraj repozitorijum
git clone https://github.com/work-dusan/biblioteka---react---node.js.git
cd biblioteka

2. Backend
cd biblioteka-backend
npm install

Pokreni backend:

npm run dev

3. Frontend
cd ../biblioteka-frontend
npm install
npm run dev


Frontend će biti dostupan na http://localhost:5173


Korisničke uloge:

Gost – pregled knjiga i detalja

Korisnik – registracija, login, uređivanje profila, favoriti, iznajmljivanje i vraćanje knjiga, pregled istorije

Admin – CRUD nad knjigama i korisnicima, pregled porudžbina, brisanje povezanih entiteta


Funkcionalnosti:

Pretraga i paginacija knjiga

Favoriti sa vizuelnim označavanjem

Iznajmljivanje i vraćanje knjiga

Istorija porudžbina

Admin panel sa pregledom i uređivanjem korisnika i knjiga

Automatsko čišćenje povezanih podataka pri brisanju knjiga ili korisnika



Dokumentacija:

Detaljna dokumentacija nalazi se u fajlu [CS310-PZ-DusanStojiljkovic5835.docx](https://github.com/user-attachments/files/21875817/CS310-PZ-DusanStojiljkovic5835.docx)
