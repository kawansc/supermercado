# Mercado Fácil

Sistema de caixa de supermercado executado localmente em `http://127.0.0.1:3000`.

## Como executar

1. Instale o Node.js (versão 18 ou superior).
2. No terminal, na pasta do projeto, execute `npm install`.
3. Execute `npm start`.

Rotas: `/`, `/produtos`, `/login`, `/cadastro`, `/pagamento` e `/nota-fiscal`.

O banco de dados local SQLite é criado automaticamente em `supermercado.db`. Há uma conta administrativa inicial: CPF `00000000000`, senha `admin123`. Administradores podem adicionar e excluir produtos; clientes só podem consultar e comprar.
