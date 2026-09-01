// Servidor HTTP, rotas da API e acesso ao banco de dados.

const express = require("express");
const cookieSession = require("cookie-session");
const path = require("path");
const database = require("./database");

const app = express();
let databaseReady;

function initializeDatabase() {
  if (!databaseReady) {
    databaseReady = database.initialize();
  }

  return databaseReady;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cookieSession({
    name: "mercado_session",
    keys: [process.env.SESSION_SECRET || "mercado-local-2026"],
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: Boolean(process.env.VERCEL),
  }),
);

app.use(express.static(path.join(__dirname, "public")));

app.use(async (request, response, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

function requireLogin(request, response, next) {
  if (!request.session?.user) {
    return response.status(401).json({
      error: "Faça login para continuar.",
    });
  }

  next();
}

function requireAdmin(request, response, next) {
  if (request.session?.user?.role !== "admin") {
    return response.status(403).json({
      error: "Acesso permitido somente a administradores.",
    });
  }

  next();
}

app.get("/api/session", (request, response) => {
  response.json({
    user: request.session?.user || null,
  });
});

app.get("/api/products", async (request, response, next) => {
  try {
    const products = await database.listProducts();
    response.json(products);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/products",
  requireLogin,
  requireAdmin,
  async (request, response, next) => {
    const { name, price, stock } = request.body;
    const numericPrice = Number(price);
    const numericStock = Number(stock);

    const invalidProduct =
      !name?.trim() ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0 ||
      !Number.isInteger(numericStock) ||
      numericStock < 0;

    if (invalidProduct) {
      return response.status(400).json({
        error: "Preencha os dados do produto corretamente.",
      });
    }

    try {
      const id = await database.createProduct(
        name.trim(),
        numericPrice,
        numericStock,
      );

      response.status(201).json({ id });
    } catch (error) {
      if (error.message.toLowerCase().includes("unique")) {
        return response.status(400).json({
          error: "Já existe um produto com esse nome.",
        });
      }

      next(error);
    }
  },
);

app.delete(
  "/api/products/:id",
  requireLogin,
  requireAdmin,
  async (request, response, next) => {
    try {
      const deleted = await database.deleteProduct(request.params.id);

      if (!deleted) {
        return response.status(404).json({
          error: "Produto não encontrado.",
        });
      }

      response.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

app.post("/api/register", async (request, response, next) => {
  const { name, cpf, contact, password } = request.body;
  const cleanCpf = (cpf || "").replace(/\D/g, "");

  if (!name?.trim() || !cleanCpf || !contact?.trim() || !password) {
    return response.status(400).json({
      error: "Preencha todos os campos.",
    });
  }

  try {
    const id = await database.createCustomer(
      name.trim(),
      cleanCpf,
      contact.trim(),
      password,
    );

    request.session.user = {
      id,
      name: name.trim(),
      role: "cliente",
    };

    response.status(201).json({
      user: request.session.user,
    });
  } catch (error) {
    if (
      error.message.toLowerCase().includes("unique") ||
      error.message.toLowerCase().includes("cpf")
    ) {
      return response.status(400).json({
        error: "CPF já cadastrado.",
      });
    }

    next(error);
  }
});

app.post("/api/login", async (request, response, next) => {
  const login = (request.body.login || "").trim();
  const cleanCpf = login.replace(/\D/g, "");

  try {
    const user = await database.findUserByLogin(login, cleanCpf || null);

    if (!user || user.password !== request.body.password) {
      return response.status(401).json({
        error: "Usuário, CPF ou senha inválidos.",
      });
    }

    request.session.user = {
      id: user.id,
      name: user.name,
      role: user.role,
    };

    response.json({
      user: request.session.user,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/logout", (request, response) => {
  request.session = null;
  response.status(204).end();
});

app.post("/api/checkout", requireLogin, async (request, response, next) => {
  const { items, payment } = request.body;
  const paymentMethods = ["pix", "credito", "debito", "dinheiro"];

  if (!Array.isArray(items) || items.length === 0 || !paymentMethods.includes(payment)) {
    return response.status(400).json({
      error: "Compra ou forma de pagamento inválida.",
    });
  }

  try {
    const sale = await database.processSale(
      request.session.user.id,
      items,
      payment,
    );

    response.status(201).json({
      id: sale.id,
      customer: request.session.user.name,
      items: sale.items,
      total: sale.total,
      payment,
      date: new Date().toLocaleString("pt-BR"),
    });
  } catch (error) {
    const expectedError =
      error.message.includes("Produto não encontrado") ||
      error.message.includes("Estoque insuficiente") ||
      error.message.includes("Quantidade inválida") ||
      error.message.includes("Carrinho vazio");

    if (expectedError) {
      return response.status(400).json({
        error: error.message,
      });
    }

    next(error);
  }
});

const siteRoutes = [
  "/",
  "/login",
  "/cadastro",
  "/pagamento",
  "/produtos",
  "/nota-fiscal",
];

siteRoutes.forEach((route) => {
  app.get(route, (request, response) => {
    response.sendFile(path.join(__dirname, "public", "index.html"));
  });
});

app.use((error, request, response, next) => {
  console.error(error);

  const missingConfiguration = error.message.includes("DATABASE_URL");

  response.status(500).json({
    error:
      process.env.NODE_ENV === "production" && !missingConfiguration
        ? "Não foi possível acessar o servidor."
        : error.message,
  });
});

if (!process.env.VERCEL) {
  app.listen(3000, "127.0.0.1", () => {
    console.log("Supermercado em http://127.0.0.1:3000");
  });
}

module.exports = app;
