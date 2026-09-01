# Mercado Fácil

## Sobre o projeto

Eu desenvolvi o Mercado Fácil como um sistema simples de caixa para supermercado. O projeto permite cadastrar clientes, controlar o acesso por nível de usuário, consultar produtos, montar um carrinho, escolher uma forma de pagamento e gerar uma nota fiscal da compra.

Minha intenção foi construir uma aplicação direta, sem recursos desnecessários, mas com todas as partes principais funcionando em conjunto: interface, servidor e banco de dados local.

O sistema é executado em:

```text
http://127.0.0.1:3000
```

## Objetivos

Os principais objetivos que defini para o projeto foram:

- Criar um fluxo de compra simples para um supermercado.
- Solicitar e armazenar os dados do cliente.
- Mostrar produtos, quantidades, valores individuais e valor final.
- Aceitar Pix, crédito, débito e dinheiro.
- Gerar uma nota fiscal depois da compra.
- Manter produtos e usuários em um banco de dados local.
- Separar as permissões de cliente e administrador.
- Criar páginas acessíveis por rotas próprias.
- Manter o código organizado e fácil de entender.

## Requisitos funcionais

### RF01 — Cadastro do cliente

O sistema permite cadastrar nome, contato, CPF e senha. O CPF não pode ser repetido no banco de dados.

### RF02 — Login

O sistema permite que clientes entrem com CPF e senha. O administrador entra com nome de usuário e senha.

### RF03 — Controle de acesso

Existem dois níveis de acesso:

- `cliente`: consulta produtos, adiciona itens ao carrinho e realiza compras;
- `admin`: possui as funções do cliente e também pode adicionar ou excluir produtos.

As permissões administrativas são verificadas no servidor. Por isso, esconder um botão na interface não é a única proteção utilizada.

### RF04 — Consulta de produtos

O sistema lista o nome, o preço e a quantidade disponível de cada produto cadastrado.

### RF05 — Gerenciamento de produtos

O administrador pode adicionar produtos informando nome, preço e estoque. Também pode excluir produtos existentes.

### RF06 — Carrinho

O cliente pode adicionar produtos, consultar o total de itens e remover produtos antes de finalizar a compra.

### RF07 — Pagamento

O sistema aceita as seguintes formas de pagamento:

- Pix;
- cartão de crédito;
- cartão de débito;
- dinheiro.

### RF08 — Nota fiscal

Depois da confirmação da compra, o sistema apresenta:

- número da compra;
- nome do cliente;
- data;
- produtos comprados;
- quantidade de cada produto;
- valor individual;
- subtotal por produto;
- forma de pagamento;
- valor final.

### RF09 — Controle de estoque

O estoque é conferido novamente pelo servidor durante o pagamento. Quando a compra é aprovada, as quantidades são descontadas do banco de dados.

## Requisitos não funcionais

### RNF01 — Interface gráfica

A aplicação possui uma interface feita com HTML e CSS, adaptada para computador e dispositivos com telas menores.

### RNF02 — Persistência local

Os usuários, produtos e vendas são armazenados em um banco SQLite criado na própria pasta do projeto.

### RNF03 — Facilidade de manutenção

O código foi separado em arquivos de interface, estilo, comportamento do navegador e servidor. Também mantive funções com responsabilidades específicas e nomes descritivos.

### RNF04 — Validação no servidor

As operações importantes são validadas pelo servidor, incluindo login, nível de acesso, dados dos produtos, forma de pagamento e estoque.

## Tecnologias utilizadas

- HTML5;
- CSS3;
- JavaScript;
- Node.js;
- Express;
- express-session;
- SQLite;
- better-sqlite3;
- npm;
- Git e GitHub.

## Estrutura dos arquivos

Nesta seção, descrevo somente a finalidade de cada arquivo.

| Arquivo | Finalidade |
| --- | --- |
| `public/index.html` | Define a estrutura base exibida pelo navegador. |
| `public/style.css` | Define cores, espaçamentos, tamanhos, responsividade e apresentação visual. |
| `public/app.js` | Controla as páginas, formulários, requisições, carrinho e conteúdo exibido no navegador. |
| `server.js` | Inicia o servidor, configura o banco e disponibiliza as rotas da aplicação e da API. |
| `package.json` | Declara os dados do projeto, os comandos npm e as dependências necessárias. |
| `.gitignore` | Informa ao Git quais arquivos locais não devem ser enviados ao repositório. |
| `README.md` | Documenta o funcionamento, a estrutura e o processo de desenvolvimento do projeto. |
| `supermercado.db` | Armazena localmente os usuários, produtos e vendas depois que o servidor é iniciado. |

## Rotas do site

| Rota | Finalidade |
| --- | --- |
| `/` | Exibe a página inicial. |
| `/produtos` | Exibe os produtos e as opções permitidas para o usuário conectado. |
| `/login` | Exibe o formulário de entrada. |
| `/cadastro` | Exibe o formulário de cadastro de clientes. |
| `/pagamento` | Exibe o carrinho e a escolha da forma de pagamento. |
| `/nota-fiscal` | Exibe o resultado da última compra concluída. |

## Rotas da API

| Método | Rota | Finalidade |
| --- | --- | --- |
| `GET` | `/api/session` | Consulta o usuário conectado na sessão atual. |
| `GET` | `/api/products` | Lista os produtos cadastrados. |
| `POST` | `/api/products` | Cadastra um produto com permissão de administrador. |
| `DELETE` | `/api/products/:id` | Exclui um produto com permissão de administrador. |
| `POST` | `/api/register` | Cadastra um cliente. |
| `POST` | `/api/login` | Valida as credenciais e inicia uma sessão. |
| `POST` | `/api/logout` | Encerra a sessão atual. |
| `POST` | `/api/checkout` | Confere o estoque, registra a venda e retorna a nota fiscal. |

## Banco de dados

Escolhi o SQLite porque ele funciona em um único arquivo e atende bem a um sistema local. O arquivo `supermercado.db` é criado automaticamente na primeira execução.

### Tabela `users`

Armazena:

- identificador;
- nome;
- nome de usuário, quando aplicável;
- CPF, quando aplicável;
- contato;
- senha;
- nível de acesso.

### Tabela `products`

Armazena:

- identificador;
- nome do produto;
- preço;
- quantidade em estoque.

### Tabela `sales`

Armazena:

- identificador da venda;
- identificador do usuário;
- itens comprados;
- valor total;
- forma de pagamento;
- data da venda.

## Fluxo de funcionamento

O fluxo principal funciona da seguinte maneira:

1. O servidor é iniciado na porta `3000`.
2. O banco de dados e as tabelas são criados, caso ainda não existam.
3. Os produtos iniciais e a conta administrativa são inseridos quando necessário.
4. O navegador solicita a página correspondente à rota acessada.
5. O JavaScript consulta a API para obter a sessão e os produtos.
6. O cliente pode criar uma conta ou entrar com seu CPF.
7. Os produtos escolhidos são guardados no carrinho do navegador.
8. No pagamento, o servidor consulta novamente cada produto no banco.
9. O servidor calcula os valores sem confiar no total enviado pelo navegador.
10. A venda e a atualização do estoque são executadas na mesma transação.
11. Se todas as etapas forem concluídas, o sistema apresenta a nota fiscal.

## Passo a passo do desenvolvimento

### 1. Planejamento

Comecei separando o projeto em três partes: interface, servidor e banco de dados. Também defini as páginas necessárias e os dois níveis de acesso.

### 2. Criação do servidor

Configurei o Express para responder em `127.0.0.1:3000`, receber dados em JSON, manter sessões e servir os arquivos da pasta `public`.

### 3. Criação do banco

Configurei o SQLite e criei as tabelas de usuários, produtos e vendas. Adicionei alguns produtos iniciais para que a aplicação já tivesse conteúdo na primeira execução.

### 4. Cadastro e login

Implementei o cadastro de clientes com nome, CPF, contato e senha. Depois criei a sessão de login e a verificação do nível de acesso em cada operação administrativa.

### 5. Produtos e estoque

Criei a listagem de produtos e as operações de adicionar e excluir. A alteração do estoque ficou no servidor para evitar que o navegador pudesse confirmar uma quantidade inválida.

### 6. Carrinho e pagamento

Usei o armazenamento local do navegador para manter o carrinho durante a navegação. Implementei a remoção de itens e as quatro formas de pagamento solicitadas.

### 7. Nota fiscal

Criei o retorno da venda com todos os valores calculados pelo servidor. A nota pode ser consultada depois da finalização e também pode ser impressa pelo navegador.

### 8. Organização da interface

Separei a marcação, o estilo e o comportamento em arquivos diferentes. Mantive uma navegação direta, formulários identificados e componentes visuais simples.

### 9. Versionamento

Inicializei o Git, criei commits para registrar as etapas e conectei o projeto ao repositório remoto no GitHub.

## Erros, bugs e correções durante o desenvolvimento

### Código muito compactado

Na primeira implementação, vários trechos de HTML, CSS, JavaScript e servidor ficaram concentrados em poucas linhas. A aplicação podia funcionar, mas a leitura e a manutenção ficaram ruins. Corrigi esse problema organizando a indentação, separando blocos e dividindo o comportamento em funções menores.

### Formulário de produto sem ação completa

Durante a criação da área administrativa, o formulário de produto chegou a ser exibido sem o evento necessário para enviar os dados. Percebi o problema ao revisar o fluxo e adicionei o tratamento do envio para chamar a API e recarregar a lista.

### Tratamento incorreto do CPF

Na primeira versão, a expressão usada para retirar caracteres não numéricos do CPF ficou escapada de forma incorreta. Isso poderia impedir a normalização do valor. Ajustei a expressão e mantive a limpeza do CPF tanto no cadastro quanto no login.

### Estoque alterado entre o carrinho e o pagamento

O estoque pode mudar depois que um item é colocado no carrinho. Para evitar uma venda inválida, deixei a conferência definitiva para o momento do pagamento. Se não houver quantidade suficiente, a transação é cancelada e o banco não registra uma venda incompleta.

### Valores enviados pelo navegador

Confiar no valor total existente no carrinho permitiria alterações pelo navegador. Corrigi esse risco fazendo o servidor consultar os preços no banco e calcular novamente cada subtotal e o total da compra.

### Histórico remoto diferente do histórico local

No primeiro envio, o GitHub recusou o `push` porque o repositório remoto já possuía um commit inicial. Em vez de sobrescrever o repositório, busquei o histórico remoto, integrei os dois históricos e fiz o envio normalmente.

### Falta de Node.js no computador local

O computador usado no desenvolvimento não tinha Node.js e npm disponíveis. Por isso, validei a sintaxe dos arquivos JavaScript separadamente e utilizei o GitHub Codespaces como alternativa para instalar as dependências e executar o servidor pelo navegador.

## Decisões que funcionaram bem

- Usar SQLite evitou a necessidade de instalar um servidor de banco separado.
- Recalcular a compra no servidor evitou confiar em valores modificáveis no navegador.
- Usar uma transação manteve a venda e o estoque consistentes.
- Verificar a função de administrador no servidor protegeu as rotas de produtos.
- Separar as rotas do site e as rotas da API deixou o fluxo mais fácil de acompanhar.
- Utilizar sessões simplificou a identificação do usuário durante a compra.
- Manter o carrinho no navegador permitiu navegar entre as páginas sem perder os itens.

## Limitações conhecidas

Este é um projeto simples e ainda possui limitações que eu melhoraria em uma aplicação de produção:

- As senhas ainda são armazenadas sem hash.
- A sessão utiliza o armazenamento padrão em memória do Express.
- O carrinho fica salvo somente no navegador atual.
- Não existe recuperação de senha.
- Não existe edição de produtos, somente cadastro e exclusão.
- Não existe uma página de histórico de vendas.
- Os dados do banco ficam disponíveis apenas na máquina ou ambiente em que o servidor está executando.
- Ainda não há testes automatizados.

## Como executar localmente

### Requisitos

- Node.js 18 ou superior;
- npm.

### Instalação

Clone o repositório:

```bash
git clone https://github.com/kawansc/supermercado.git
```

Entre na pasta:

```bash
cd supermercado
```

Instale as dependências:

```bash
npm install
```

Inicie o servidor:

```bash
npm start
```

Acesse:

```text
http://127.0.0.1:3000
```

## Como executar no GitHub Codespaces

1. Abra o repositório no GitHub.
2. Clique em `Code`.
3. Abra a aba `Codespaces`.
4. Crie ou abra um Codespace da branch `main`.
5. Execute `npm install` no terminal.
6. Execute `npm start`.
7. Abra a porta `3000` pela aba `PORTS`.

Para atualizar um Codespace existente:

```bash
git pull origin main
npm install
npm start
```

## Acesso administrativo

```text
Usuário: adminS
Senha: admin123
```

Essa conta é criada automaticamente quando o banco é inicializado.

## Roteiro de testes manuais

Defini o seguinte roteiro para conferir os principais fluxos:

1. Abrir a página inicial.
2. Consultar a lista de produtos.
3. Criar uma conta de cliente.
4. Sair e entrar novamente usando o CPF.
5. Adicionar produtos ao carrinho.
6. Remover um item do carrinho.
7. Finalizar uma compra em cada forma de pagamento.
8. Conferir produtos, quantidades e valores na nota fiscal.
9. Entrar como administrador.
10. Cadastrar um produto.
11. Excluir um produto.
12. Confirmar que uma conta de cliente não consegue usar as rotas administrativas.
13. Tentar comprar uma quantidade maior que o estoque disponível.
14. Reiniciar o servidor e confirmar que os dados continuam no banco.

## Possíveis melhorias

- Aplicar hash seguro nas senhas.
- Criar uma tela de edição de produtos.
- Criar um histórico de vendas por cliente.
- Criar relatórios para o administrador.
- Salvar o carrinho no banco.
- Adicionar recuperação de senha.
- Criar testes automatizados para a API.
- Melhorar as mensagens de confirmação das operações.
