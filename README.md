# Mercado Fácil

## Sobre o trabalho
Nós usamos HTML, CSS e JavaScript na parte visual. Também usamos Node.js para iniciar o servidor e SQLite para guardar os dados no próprio projeto.

O sistema funciona no endereço:

```text
http://127.0.0.1:3000
```

## Organização do grupo

Como o grupo tinha cinco integrantes, nós dividimos o trabalho por partes. Cada integrante ficou responsável por desenvolver uma etapa em casa. Depois, juntamos tudo, conferimos o código e corrigimos o que não estava funcionando.

### Planejamento e organização

Uma parte do grupo ficou responsável por entender a atividade, separar o que precisava ser feito e organizar as páginas do site. Nessa etapa, decidimos quais informações apareceriam em cada tela e como o usuário passaria de uma página para outra.

### Interface do site

Outra parte ficou responsável pelo HTML e pelo CSS. O objetivo foi deixar as páginas organizadas, com cores simples, boa leitura e uma aparência parecida com um sistema comum de supermercado.

### Cadastro e login

Outra parte cuidou do cadastro dos clientes e da tela de entrada. Também foi feita a diferença entre o acesso de cliente e o acesso de administrador.

### Produtos e banco de dados

Outra parte ficou responsável pelos produtos e pelo banco de dados. Essa etapa incluiu o cadastro dos produtos, o preço, a quantidade em estoque e o salvamento dos usuários e das vendas.

### Carrinho, pagamento e nota fiscal

A última parte ficou responsável pelo carrinho e pela finalização da compra. Nessa etapa, foram feitas as formas de pagamento, o cálculo do total, a atualização do estoque e a nota fiscal.

Mesmo com a divisão, todos ajudaram na revisão e nos testes antes de enviar o projeto para o GitHub.

## Especificações do projeto

### Dados do cliente

O cadastro pede nome, contato, CPF e senha. Esses dados são usados para identificar o cliente durante a compra.

### Nota fiscal

Depois do pagamento, o sistema mostra os produtos comprados, a quantidade, o preço de cada item, o subtotal e o valor final da compra.

### Formas de pagamento

O cliente pode escolher entre Pix, cartão de crédito, cartão de débito ou dinheiro.

### Interface gráfica

O site possui páginas para início, produtos, login, cadastro, pagamento e nota fiscal. O visual foi feito para ser simples e funcionar tanto no computador quanto em telas menores.

### Produtos e estoque

Os produtos possuem nome, preço e quantidade disponível. Quando uma compra é finalizada, o estoque é atualizado.

### Níveis de acesso

O cliente pode consultar produtos e fazer compras. O administrador também pode adicionar e excluir produtos.

## Como o sistema funciona

Primeiro, o servidor cria o banco de dados caso ele ainda não exista. Alguns produtos básicos também são adicionados para que o sistema já possa ser testado.

O cliente pode entrar com CPF e senha ou fazer um novo cadastro. Depois disso, ele escolhe os produtos e adiciona ao carrinho. Na tela de pagamento, é possível conferir os itens, remover algum produto e escolher a forma de pagamento.

Antes de concluir a venda, o sistema confere se ainda existe estoque. Se estiver tudo certo, a compra é salva, as quantidades são atualizadas e a nota fiscal é mostrada.

O administrador entra com um usuário próprio. Depois do login, aparecem as opções para adicionar ou excluir produtos.

## Páginas do projeto

| Endereço | Para que serve |
| --- | --- |
| `/` | Página inicial do site. |
| `/produtos` | Mostra os produtos disponíveis. |
| `/login` | Permite entrar no sistema. |
| `/cadastro` | Permite cadastrar um cliente. |
| `/pagamento` | Mostra o carrinho e as formas de pagamento. |
| `/nota-fiscal` | Mostra os dados da compra finalizada. |

## Para que serve cada arquivo

| Arquivo | Para que serve |
| --- | --- |
| `public/index.html` | Contém a estrutura principal que aparece no navegador. |
| `public/style.css` | Cuida das cores, tamanhos, espaços e aparência das páginas. |
| `public/app.js` | Controla os formulários, as páginas e o carrinho. |
| `server.js` | Inicia o servidor e faz a ligação com o banco de dados. |
| `package.json` | Guarda as dependências e os comandos do projeto. |
| `.gitignore` | Evita que arquivos locais sejam enviados para o GitHub. |
| `README.md` | Explica o projeto e ensina como executar. |
| `supermercado.db` | Guarda os usuários, produtos e vendas no computador. |

## Etapas do desenvolvimento

No começo, nós criamos a estrutura básica do projeto e separamos os arquivos. Em seguida, fizemos o servidor e o banco de dados. Depois, criamos as páginas de cadastro, login e produtos.

Com essa parte pronta, fizemos o carrinho, o pagamento e a nota fiscal. Por último, organizamos o visual, revisamos o código e enviamos o projeto para o GitHub.

## Problemas que apareceram

Durante o desenvolvimento, alguns códigos ficaram escritos em linhas muito grandes. Isso dificultava a leitura, então nós separamos e organizamos melhor cada parte.

O formulário usado para adicionar produtos também chegou a aparecer sem enviar os dados corretamente. O problema estava na ação do formulário e foi corrigido no JavaScript.

Também tivemos um erro no tratamento do CPF. A forma usada para retirar pontos e traços não estava correta, então ajustamos essa parte antes de continuar.

Outro problema aconteceu no primeiro envio para o GitHub. O repositório já tinha um arquivo inicial e o envio foi recusado. Nós juntamos o histórico que já existia com o projeto e conseguimos enviar normalmente.

O computador usado no começo não tinha Node.js e npm instalados. Para continuar os testes, usamos o GitHub Codespaces, que permite executar o projeto pelo navegador.

## O que deu certo

O uso do SQLite facilitou bastante porque não foi necessário instalar um programa separado para o banco de dados. Os dados ficam guardados em um único arquivo.

Também foi importante conferir o estoque e os preços no servidor. Dessa forma, a compra não depende apenas das informações que estão no navegador.

A divisão do trabalho ajudou o grupo a desenvolver várias partes ao mesmo tempo. No final, a revisão em conjunto foi importante para corrigir diferenças entre os arquivos.

## Limitações atuais

O projeto atende ao que foi pedido, mas ainda poderia receber algumas melhorias. As senhas poderiam ter uma proteção maior, poderia existir uma opção para editar produtos e também seria possível criar uma página com o histórico das vendas.

Como este é um sistema local e simples, o carrinho fica salvo somente no navegador e o banco de dados fica no ambiente em que o servidor está sendo executado.

## Como executar no computador

É necessário ter Node.js e npm instalados.

Clone o projeto:

```bash
git clone https://github.com/kawansc/supermercado.git
```

Entre na pasta:

```bash
cd supermercado
```

Instale os arquivos necessários:

```bash
npm install
```

Inicie o sistema:

```bash
npm start
```

Depois, abra no navegador:

```text
http://127.0.0.1:3000
```

## Como executar pelo Codespaces

No repositório do GitHub, clique em `Code`, abra a opção `Codespaces` e crie um ambiente na branch `main`.

Quando o terminal abrir, execute:

```bash
npm install
npm start
```

Depois, abra a porta `3000` na parte de portas do Codespaces.

## Acesso do administrador

```text
Usuário: adminS
Senha: admin123
```

## Conclusão

Com este trabalho, nós praticamos a criação de páginas, o uso de JavaScript, a ligação com um servidor e o salvamento de informações em um banco de dados.

O resultado foi um sistema simples de supermercado que permite cadastrar clientes, controlar produtos, realizar compras e mostrar a nota fiscal. O trabalho em grupo também ajudou na organização, na divisão das tarefas e na correção dos problemas que apareceram durante o desenvolvimento.
