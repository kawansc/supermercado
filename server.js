const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'supermercado.db'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, cpf TEXT UNIQUE NOT NULL, contact TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'cliente');
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY, user_id INTEGER, items TEXT NOT NULL, total REAL NOT NULL, payment TEXT NOT NULL, created_at TEXT NOT NULL);`);
if (!db.prepare('SELECT id FROM users WHERE cpf = ?').get('00000000000')) db.prepare('INSERT INTO users (name,cpf,contact,password,role) VALUES (?,?,?,?,?)').run('Administrador', '00000000000', 'admin@mercado.local', 'admin123', 'admin');
if (!db.prepare('SELECT id FROM products LIMIT 1').get()) {
  const add = db.prepare('INSERT INTO products (name,price,stock) VALUES (?,?,?)');
  [['Arroz 5kg', 28.90, 20], ['Feijão 1kg', 8.49, 35], ['Leite integral', 5.99, 40], ['Café 500g', 18.50, 18], ['Macarrão 500g', 5.25, 50]].forEach(p => add.run(...p));
}

app.use(express.json()); app.use(express.urlencoded({extended:true}));
app.use(session({secret:'supermercado-local-2026', resave:false, saveUninitialized:false}));
app.use(express.static(path.join(__dirname, 'public')));
const auth = (req,res,next) => req.session.user ? next() : res.status(401).json({error:'Faça login para continuar.'});
const admin = (req,res,next) => req.session.user?.role === 'admin' ? next() : res.status(403).json({error:'Acesso permitido somente a administradores.'});

app.get('/api/session', (req,res) => res.json({user:req.session.user || null}));
app.get('/api/products', (req,res) => res.json(db.prepare('SELECT * FROM products ORDER BY name').all()));
app.post('/api/products', auth, admin, (req,res) => { const {name,price,stock}=req.body; if(!name || Number(price)<0 || Number(stock)<0) return res.status(400).json({error:'Preencha os dados do produto corretamente.'}); const result=db.prepare('INSERT INTO products (name,price,stock) VALUES (?,?,?)').run(name.trim(),Number(price),Number(stock)); res.status(201).json({id:result.lastInsertRowid}); });
app.delete('/api/products/:id', auth, admin, (req,res) => { const result=db.prepare('DELETE FROM products WHERE id=?').run(req.params.id); if(!result.changes) return res.status(404).json({error:'Produto não encontrado.'}); res.status(204).end(); });
app.post('/api/register', (req,res) => { const {name,cpf,contact,password}=req.body; if(!name||!cpf||!contact||!password) return res.status(400).json({error:'Preencha todos os campos.'}); try { const r=db.prepare("INSERT INTO users (name,cpf,contact,password,role) VALUES (?,?,?,?, 'cliente')").run(name.trim(),cpf.replace(/\D/g,''),contact.trim(),password); req.session.user={id:r.lastInsertRowid,name:name.trim(),role:'cliente'}; res.status(201).json({user:req.session.user}); } catch { res.status(400).json({error:'CPF já cadastrado.'}); } });
app.post('/api/login', (req,res) => { const user=db.prepare('SELECT id,name,role,password FROM users WHERE cpf=?').get((req.body.cpf||'').replace(/\D/g,'')); if(!user || user.password!==req.body.password) return res.status(401).json({error:'CPF ou senha inválidos.'}); req.session.user={id:user.id,name:user.name,role:user.role}; res.json({user:req.session.user}); });
app.post('/api/logout', (req,res) => req.session.destroy(()=>res.status(204).end()));
app.post('/api/checkout', auth, (req,res) => { const {items,payment}=req.body; if(!Array.isArray(items)||!items.length||!['pix','credito','debito','dinheiro'].includes(payment)) return res.status(400).json({error:'Compra ou forma de pagamento inválida.'}); let total=0, invoice=[]; const get=db.prepare('SELECT * FROM products WHERE id=?'); const update=db.prepare('UPDATE products SET stock=stock-? WHERE id=?'); const sale=db.prepare('INSERT INTO sales (user_id,items,total,payment,created_at) VALUES (?,?,?,?,?)'); const process=db.transaction(()=>{ for(const it of items){const p=get.get(it.id), q=Number(it.quantity); if(!p||!Number.isInteger(q)||q<1||p.stock<q) throw new Error(p?`Estoque insuficiente para ${p.name}.`:'Produto não encontrado.'); total+=p.price*q; invoice.push({name:p.name,quantity:q,price:p.price,subtotal:p.price*q}); update.run(q,p.id);} return sale.run(req.session.user.id,JSON.stringify(invoice),total,payment,new Date().toISOString()).lastInsertRowid; }); try { const id=process(); res.status(201).json({id,customer:req.session.user.name,items:invoice,total,payment,date:new Date().toLocaleString('pt-BR')}); } catch(e) { res.status(400).json({error:e.message}); } });
['/','/login','/cadastro','/pagamento','/produtos','/nota-fiscal'].forEach(route=>app.get(route,(req,res)=>res.sendFile(path.join(__dirname,'public','index.html'))));
app.listen(3000,'127.0.0.1',()=>console.log('Supermercado em http://127.0.0.1:3000'));
