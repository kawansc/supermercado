// Acesso ao SQLite local e ao PostgreSQL usado no Vercel.

const path = require("path");

const initialProducts = [
  ["Arroz 5kg", 28.9, 20],
  ["Feijão 1kg", 8.49, 35],
  ["Leite integral", 5.99, 40],
  ["Café 500g", 18.5, 18],
  ["Macarrão 500g", 5.25, 50],
];

function createMissingDatabase() {
  return {
    async initialize() {
      throw new Error(
        "O banco online ainda não foi conectado. Configure DATABASE_URL no Vercel.",
      );
    },
  };
}

function createSqliteDatabase() {
  const Database = require("better-sqlite3");
  const databasePath = path.join(__dirname, "supermercado.db");
  const db = new Database(databasePath);

  return {
    async initialize() {
      db.pragma("journal_mode = WAL");

      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT UNIQUE,
          cpf TEXT UNIQUE,
          contact TEXT NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'cliente'
        );

        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY,
          user_id INTEGER,
          items TEXT NOT NULL,
          total REAL NOT NULL,
          payment TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      const userColumns = db.prepare("PRAGMA table_info(users)").all();
      const hasUsername = userColumns.some((column) => column.name === "username");

      if (!hasUsername) {
        db.exec("ALTER TABLE users ADD COLUMN username TEXT");
      }

      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_username_index
        ON users (username);
      `);

      const admin = db
        .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        .get();

      if (admin) {
        db.prepare("UPDATE users SET username = ? WHERE id = ?").run(
          "adminS",
          admin.id,
        );
      } else {
        const cpfColumn = userColumns.find((column) => column.name === "cpf");
        const adminCpf = cpfColumn?.notnull ? "ADMIN" : null;

        db.prepare(`
          INSERT INTO users (name, username, cpf, contact, password, role)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          "Administrador",
          "adminS",
          adminCpf,
          "admin@mercado.local",
          "admin123",
          "admin",
        );
      }

      const firstProduct = db.prepare("SELECT id FROM products LIMIT 1").get();

      if (!firstProduct) {
        const insertProduct = db.prepare(`
          INSERT INTO products (name, price, stock)
          VALUES (?, ?, ?)
        `);

        initialProducts.forEach((product) => {
          insertProduct.run(...product);
        });
      }
    },

    async listProducts() {
      return db.prepare("SELECT * FROM products ORDER BY name").all();
    },

    async createProduct(name, price, stock) {
      const result = db
        .prepare(`
          INSERT INTO products (name, price, stock)
          VALUES (?, ?, ?)
        `)
        .run(name, price, stock);

      return Number(result.lastInsertRowid);
    },

    async deleteProduct(id) {
      const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
      return result.changes > 0;
    },

    async createCustomer(name, cpf, contact, password) {
      const result = db
        .prepare(`
          INSERT INTO users (name, cpf, contact, password, role)
          VALUES (?, ?, ?, ?, 'cliente')
        `)
        .run(name, cpf, contact, password);

      return Number(result.lastInsertRowid);
    },

    async findUserByLogin(login, cpf) {
      return db
        .prepare(`
          SELECT id, name, role, password
          FROM users
          WHERE username = ? OR cpf = ?
        `)
        .get(login, cpf);
    },

    async processSale(userId, items, payment) {
      const findProduct = db.prepare("SELECT * FROM products WHERE id = ?");
      const updateStock = db.prepare(`
        UPDATE products
        SET stock = stock - ?
        WHERE id = ?
      `);
      const insertSale = db.prepare(`
        INSERT INTO sales (user_id, items, total, payment, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        let total = 0;
        const invoiceItems = [];

        for (const item of items) {
          const product = findProduct.get(item.id);
          const quantity = Number(item.quantity);

          if (!product) {
            throw new Error("Produto não encontrado.");
          }

          if (!Number.isInteger(quantity) || quantity < 1 || product.stock < quantity) {
            throw new Error(`Estoque insuficiente para ${product.name}.`);
          }

          const subtotal = product.price * quantity;
          total += subtotal;

          invoiceItems.push({
            name: product.name,
            quantity,
            price: product.price,
            subtotal,
          });

          updateStock.run(quantity, product.id);
        }

        const result = insertSale.run(
          userId,
          JSON.stringify(invoiceItems),
          total,
          payment,
          new Date().toISOString(),
        );

        return {
          id: Number(result.lastInsertRowid),
          items: invoiceItems,
          total,
        };
      });

      return transaction();
    },
  };
}

function createPostgresDatabase() {
  const { neon } = require("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  return {
    async initialize() {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT UNIQUE,
          cpf TEXT UNIQUE,
          contact TEXT NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'cliente'
        )
      `);

      await sql.query(`
        CREATE TABLE IF NOT EXISTS products (
          id BIGSERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0
        )
      `);

      await sql.query(`
        CREATE TABLE IF NOT EXISTS sales (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          items JSONB NOT NULL,
          total NUMERIC(12, 2) NOT NULL,
          payment TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await sql.query(`
        CREATE OR REPLACE FUNCTION process_supermarket_sale(
          p_user_id BIGINT,
          p_items JSONB,
          p_payment TEXT
        ) RETURNS JSONB
        LANGUAGE plpgsql
        AS $$
        DECLARE
          requested RECORD;
          product_record RECORD;
          invoice_items JSONB := '[]'::JSONB;
          sale_total NUMERIC(12, 2) := 0;
          new_sale_id BIGINT;
        BEGIN
          IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
            RAISE EXCEPTION 'Carrinho vazio.';
          END IF;

          FOR requested IN
            SELECT
              (item->>'id')::BIGINT AS id,
              SUM((item->>'quantity')::INTEGER)::INTEGER AS quantity
            FROM jsonb_array_elements(p_items) AS item
            GROUP BY (item->>'id')::BIGINT
          LOOP
            IF requested.quantity < 1 THEN
              RAISE EXCEPTION 'Quantidade inválida.';
            END IF;

            SELECT id, name, price, stock
            INTO product_record
            FROM products
            WHERE id = requested.id
            FOR UPDATE;

            IF NOT FOUND THEN
              RAISE EXCEPTION 'Produto não encontrado.';
            END IF;

            IF product_record.stock < requested.quantity THEN
              RAISE EXCEPTION 'Estoque insuficiente para %.', product_record.name;
            END IF;

            sale_total := sale_total + (product_record.price * requested.quantity);

            invoice_items := invoice_items || jsonb_build_array(
              jsonb_build_object(
                'name', product_record.name,
                'quantity', requested.quantity,
                'price', product_record.price,
                'subtotal', product_record.price * requested.quantity
              )
            );

            UPDATE products
            SET stock = stock - requested.quantity
            WHERE id = product_record.id;
          END LOOP;

          INSERT INTO sales (user_id, items, total, payment)
          VALUES (p_user_id, invoice_items, sale_total, p_payment)
          RETURNING id INTO new_sale_id;

          RETURN jsonb_build_object(
            'id', new_sale_id,
            'items', invoice_items,
            'total', sale_total
          );
        END;
        $$
      `);

      await sql.query(
        `
          INSERT INTO users (name, username, cpf, contact, password, role)
          VALUES ($1, $2, NULL, $3, $4, 'admin')
          ON CONFLICT (username) DO UPDATE
          SET name = EXCLUDED.name, role = 'admin'
        `,
        ["Administrador", "adminS", "admin@mercado.local", "admin123"],
      );

      for (const product of initialProducts) {
        await sql.query(
          `
            INSERT INTO products (name, price, stock)
            VALUES ($1, $2, $3)
            ON CONFLICT (name) DO NOTHING
          `,
          product,
        );
      }
    },

    async listProducts() {
      const products = await sql.query(`
        SELECT id, name, price, stock
        FROM products
        ORDER BY name
      `);

      return products.map((product) => ({
        id: Number(product.id),
        name: product.name,
        price: Number(product.price),
        stock: Number(product.stock),
      }));
    },

    async createProduct(name, price, stock) {
      const rows = await sql.query(
        `
          INSERT INTO products (name, price, stock)
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [name, price, stock],
      );

      return Number(rows[0].id);
    },

    async deleteProduct(id) {
      const rows = await sql.query(
        "DELETE FROM products WHERE id = $1 RETURNING id",
        [id],
      );

      return rows.length > 0;
    },

    async createCustomer(name, cpf, contact, password) {
      const rows = await sql.query(
        `
          INSERT INTO users (name, cpf, contact, password, role)
          VALUES ($1, $2, $3, $4, 'cliente')
          RETURNING id
        `,
        [name, cpf, contact, password],
      );

      return Number(rows[0].id);
    },

    async findUserByLogin(login, cpf) {
      const rows = await sql.query(
        `
          SELECT id, name, role, password
          FROM users
          WHERE username = $1 OR cpf = $2
          LIMIT 1
        `,
        [login, cpf],
      );

      if (!rows[0]) {
        return null;
      }

      return {
        ...rows[0],
        id: Number(rows[0].id),
      };
    },

    async processSale(userId, items, payment) {
      const rows = await sql.query(
        "SELECT process_supermarket_sale($1, $2::jsonb, $3) AS sale",
        [userId, JSON.stringify(items), payment],
      );

      const sale = rows[0].sale;

      return {
        id: Number(sale.id),
        items: sale.items.map((item) => ({
          ...item,
          price: Number(item.price),
          subtotal: Number(item.subtotal),
        })),
        total: Number(sale.total),
      };
    },
  };
}

function selectDatabase() {
  if (process.env.DATABASE_URL) {
    return createPostgresDatabase();
  }

  if (process.env.VERCEL) {
    return createMissingDatabase();
  }

  return createSqliteDatabase();
}

module.exports = selectDatabase();
