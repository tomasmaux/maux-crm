-- MAUX CRM — Supabase schema
-- Spusť celý tento soubor v Supabase → SQL Editor → New query

-- ─── TABULKA KLIENTŮ ───
create table if not exists clients (
  id text primary key,
  name text not null,
  type text not null default 'firma',
  ico text default '',
  reg text default '',
  invoiced numeric default 0,
  contact text default '',
  emails jsonb default '[]',
  services jsonb default '[]',
  notes text default '',
  status text default 'aktivní',
  uschovaaml boolean default false,
  last_work_date date,
  file_link text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── RLS (Row Level Security) — pouze přihlášený uživatel vidí data ───
alter table clients enable row level security;

create policy "read_clients" on clients
  for select to authenticated using (true);

create policy "insert_clients" on clients
  for insert to authenticated with check (true);

create policy "update_clients" on clients
  for update to authenticated using (true);

create policy "delete_clients" on clients
  for delete to authenticated using (true);

-- ─── SEED: 31 klientů z listu KLIENTI ───
-- Spustí se pouze pokud je tabulka prázdná
insert into clients (id,name,type,ico,reg,invoiced,contact,emails,services,notes)
select * from (values
  ('cl_1','RUFU realitní s.r.o.','firma','22113169','IČO: 22113169',251281,'Jan Popek, MBA','["janpopek23@gmail.com","sicakmichal1@gmail.com"]'::jsonb,'["Reality / transakce","Smlouvy o dílo / výstavba","AML","Spory / proces","Korporát","Zápůjčky / úvěry"]'::jsonb,'Příprava rezervační smlouvy dle instrukce klienta – Křečhoř'),
  ('cl_2','RUFU developerská s.r.o.','firma','05097835','IČO: 05097835',240584,'Ing. Michal Sičák','["sicakmichal1@gmail.com"]'::jsonb,'["Reality / transakce","Smlouvy o dílo / výstavba","Spory / proces","Korporát","Zápůjčky / úvěry","Pracovní / NDA"]'::jsonb,'smlouva o dílo - rekonstrukce bytových jednotek'),
  ('cl_3','Rodinná farma Kratochvíl s.r.o.','firma','22113011','IČO: 22113011',102512,'Ing. Jaroslav Kratochvíl','["j.kratochvil@rodinna-farma.cz","fakturace@rodinna-farma.cz"]'::jsonb,'["Reality / transakce","Spory / proces","Zápůjčky / úvěry","Nájemní vztahy"]'::jsonb,'Mochov - převod pozemků; příprava převodní dokumentace'),
  ('cl_4','RUFU investiční s.r.o.','firma','22113169','IČO: 22113169',100128,'Ing. Michal Sičák','["sicakmichal1@gmail.com"]'::jsonb,'["Reality / transakce","Smlouvy o dílo / výstavba","Spory / proces"]'::jsonb,'Jizbovi – příprava výhradní zprostředkovatelské smlouvy'),
  ('cl_5','GEBAUER-Poděbrady s.r.o.','firma','26182491','IČO: 26182491',97526,'Ing. Ludvík Gebauer','["ludvikgebauer@email.cz"]'::jsonb,'["Korporát","Nájemní vztahy"]'::jsonb,'koordinační jednání s klientem ohledně nové kauzy'),
  ('cl_6','MV reality s.r.o.','firma','28186711','IČO: 28186711',74570,'Martin Vaner','["michal.vrnak@mvreality.cz","martin.vaner@mvreality.cz"]'::jsonb,'["Reality / transakce","Spory / proces","Korporát","Nájemní vztahy"]'::jsonb,'Oznámení o neprodloužení nájemní smlouvy'),
  ('cl_7','Gustav Sechter','firma','18001246','IČO: 18001246',65880,'Gustav Sechter','["gusta.sechter@gmail.com"]'::jsonb,'["Korporát"]'::jsonb,'Spor ohledně Smlouvy o smlouvě budoucí'),
  ('cl_8','Freedom – stav s.r.o','firma','22381376','IČO: 22381376',50820,'Tomáš Svoboda','["info@freedom-stav.cz"]'::jsonb,'[]'::jsonb,'osobní jednání s klientem v kanceláři'),
  ('cl_9','Milena Barešová','firma','71104836','IČO: 71104836',49610,'Milena Barešová','["milena.baresova@mvreality.cz"]'::jsonb,'["Reality / transakce","Smlouvy o dílo / výstavba","Spory / proces","Korporát"]'::jsonb,'Setkání s klientem a převzetí případu'),
  ('cl_10','Ivana Smutná','osoba','','',28630,'Ivana Smutná','["ismutna@email.cz"]'::jsonb,'["Reality / transakce"]'::jsonb,'Poděbradská blata, a.s. transakce'),
  ('cl_11','Nikola Hájková','osoba','','',28630,'Nikol Hájková','["hucul158@seznam.cz"]'::jsonb,'["Reality / transakce"]'::jsonb,'Poděbradská blata, a.s. transakce'),
  ('cl_12','Josef Šena','osoba','','dat. nar. 30.07.1948\nBudapešťská 1872/22, 405 02 Děčín VI-Letná',27420,'Josef Šena','["josef.sena@ryko.eu"]'::jsonb,'["Reality / transakce"]'::jsonb,'příprava transakční dokumentace - smlouva darovací'),
  ('cl_13','ŽALUZIONISTA s.r.o.','firma','02373824','IČO: 02373824',15730,'Jakub Suchý','["zaluzionista@gmail.com"]'::jsonb,'["Korporát"]'::jsonb,'Založení společnosti ŽALUZIONISTA s.r.o.'),
  ('cl_14','LEIBI MEDICAL s.r.o.','firma','03691721','IČO: 03691721',15173,'MUDr. Ivo Bilinec','["IvoBilinec@seznam.cz"]'::jsonb,'["Reality / transakce","Spory / proces"]'::jsonb,'příprava smluvní dokumentace pro převod 3 s.r.o.'),
  ('cl_15','NG Real Estate s.r.o.','firma','19712405','IČO: 19712405',15125,'Kristína Beranová','["beranova@nfgas.cz"]'::jsonb,'[]'::jsonb,'transakce nemovitosti - Poděbrady (Šafář)'),
  ('cl_16','Vlastimil Slušný','osoba','','dat. nar. 24.07.1984, trvale Rasochy 58, Uhlířská Lhota',15125,'Vlastimil Slušný','["vslusny@seznam.cz"]'::jsonb,'[]'::jsonb,'založení Stavby Slušný s.r.o.'),
  ('cl_17','Jiří Podruh','osoba','','dat. nar. 03.07.1976, Budiměřice 76',12366,'Jiří Podruh','["jpodruh@seznam.cz"]'::jsonb,'[]'::jsonb,'založení společnosti podruhovi, s.r.o.'),
  ('cl_18','Andrea Čechmanová','firma','02103001','IČO: 02103001',10260,'Andrea Čechmanová','["andrea.cechmanova@anmavi.cz"]'::jsonb,'["Spory / proces"]'::jsonb,'Příprava dohody o skončení obchodní spolupráce'),
  ('cl_19','Konstrux solution s.r.o.','firma','07759037','IČO: 07759037',9801,'Jan Tuček','["jt.jan.tucek@gmail.com"]'::jsonb,'["Reality / transakce"]'::jsonb,'příprava smlouvy o zápůjčce'),
  ('cl_20','Merch Waves s.r.o.','firma','21949824','IČO: 21949824',8470,'Petr Staněk','["petr@merchwaves.cz"]'::jsonb,'["Reality / transakce"]'::jsonb,'Převod 30% podílu společnosti'),
  ('cl_21','Josef Procházka','osoba','','dat. nar. 02.06.1959, Pionýrů 621/14, Poděbrady II',9680,'Josef Procházka','["josproch@email.cz"]'::jsonb,'[]'::jsonb,'příjezdová cesta - věcné břemeno'),
  ('cl_22','Starling Luxury, s.r.o.','firma','23975407','IČO: 23975407',7260,'Šárka Straková','["sarka.straka@seznam.cz"]'::jsonb,'["Korporát"]'::jsonb,'Příprava dokumentace k založení s.r.o.'),
  ('cl_23','Michal Černý','osoba','','79a Vanbrugh Park, SE3 7JQ, Greenwich, London, UK',7260,'Michal Černý','["cernymichal41@gmail.com"]'::jsonb,'["Reality / transakce"]'::jsonb,'příprava stanoviska - Úmyslovice'),
  ('cl_24','Zdeňka Vášková','osoba','','dat. nar. 09.08.1959, Na Dláždění 61/9, Poděbrady III',5082,'Miroslava Vášková','["m.vasko@vask.cz"]'::jsonb,'["Reality / transakce"]'::jsonb,'převod 1/2 podílu na nemovitosti - Odřepsy'),
  ('cl_25','Jaroslav Škvor','osoba','','dat. nar. 16.07.1966, Gdaňská 336/21, Praha 8',4840,'Jaroslav Škvor','["skvor66@gmail.com"]'::jsonb,'["Reality / transakce"]'::jsonb,'převod vlastnického práva - darování nemovitosti'),
  ('cl_26','Richad Popl','firma','46915008','IČO: 46915008',4840,'Matěj Popl','["matej.popl03@gmail.com"]'::jsonb,'[]'::jsonb,'příprava smlouvy na výdejní automaty (tabák)'),
  ('cl_27','Jana Demeterová','osoba','','dat. nar. 30.10.1998, Drahelická 2/71, Nymburk',4840,'Jana Demeterová','["JanaDemeterova99@seznam.cz"]'::jsonb,'["Nájemní vztahy"]'::jsonb,'vymáhání jistoty'),
  ('cl_28','Iveta Bělohlávková','osoba','','dat. nar. 26.09.1986, Choťánky 158',3630,'Iveta Bělohlávková','["ivetbelbel@seznam.cz"]'::jsonb,'[]'::jsonb,'Právní podpora v insolvenčním řízení'),
  ('cl_29','ANMAVI účetnictví s.r.o.','firma','22152130','IČO: 22152130',0,'Andrea Čechmanová','["andrea.cechmanova@anmavi.cz"]'::jsonb,'["Spory / proces"]'::jsonb,'Vzorová smlouva o poskytování účetních služeb'),
  ('cl_30','Lukáš Syřínek','firma','02999421','IČO: 02999421',0,'Lukáš Syřínek','["info@stavbysyrinek.eu","fakturace@stavbysyrinek.eu"]'::jsonb,'[]'::jsonb,'stavební společnost / developer'),
  ('cl_31','Otto Frinta','osoba','','dat. nar. 14.10.1991, Čechova 1429, Poděbrady III',3630,'Otto Frinta','["otto.frinta@gmail.com"]'::jsonb,'[]'::jsonb,'')
) as v(id,name,type,ico,reg,invoiced,contact,emails,services,notes)
where not exists (select 1 from clients limit 1);
