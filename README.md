# CarbonMob — Sprint 4

Projeto acadêmico de mobilidade sustentável e mercado demonstrativo de créditos de carbono.

Nesta versão, o sistema utiliza **Node.js**, **Express**, **EJS** e **MySQL**. O código está separado por pastas e escrito com indentação para facilitar a leitura e a apresentação do trabalho.

## 1. O que foi implementado

### Contas e acesso
- Cadastro de pessoas e empresas.
- Login com senha protegida por hash usando bcrypt.
- Sair da conta e entrar com outra conta.
- Sessões salvas no MySQL.
- Os registros são filtrados pelo usuário conectado.

### Mobilidade e emissões
- Cadastro e histórico de deslocamentos de carro, motocicleta e ônibus.
- Cálculo de carro e moto usando distância, combustível e consumo informado.
- Comparação entre carro e motocicleta no mesmo trajeto.
- A comparação mostra a emissão total e a estimativa por pessoa, considerando a quantidade de ocupantes.
- Transporte público tem cálculo separado por passageiro.
- Página de impacto e meta mensal.
- Mensagens incentivando bicicleta, caminhada e transporte coletivo. Essas opções são sugestões e não entram na comparação numérica principal.

### Mercado de créditos de carbono
- Conta de empresa pode anunciar créditos.
- Pessoas e empresas podem pesquisar e comprar créditos.
- Filtros por categoria, nome do projeto e preço.
- Área de compras, anúncios e vendas.
- Histórico demonstrativo de preços.
- A cada compra, o preço do anúncio pode subir gradualmente conforme a parte do estoque que já foi vendida, limitado a 15% do preço inicial. É uma regra didática inspirada em oferta e procura, não uma cotação real de bolsa.
- Compradores podem registrar o uso demonstrativo dos créditos para compensação.

## 2. Estrutura das pastas

```text
CarbonMob_Sprint4_HTML/
│
├── config/
│   └── database.js
│
├── database/
│   └── banco.sql
│
├── middleware/
│   └── auth.js
│
├── public/
│   └── styles.css
│
├── routes/
│   ├── app.js
│   └── auth.js
│
├── views/
│   ├── partials/
│   │   ├── head.ejs
│   │   ├── sidebar.ejs
│   │   └── footer.ejs
│   ├── anunciar.ejs
│   ├── cadastro.ejs
│   ├── comparar.ejs
│   ├── creditos.ejs
│   ├── deslocamentos.ejs
│   ├── impacto.ejs
│   ├── login.ejs
│   ├── meus-creditos.ejs
│   ├── minha-conta.ejs
│   └── painel.ejs
│
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## 3. Como preparar o banco de dados

1. Abra o MySQL Workbench.
2. Abra o arquivo `database/banco.sql`.
3. Execute o script completo para criar o banco `carbonmob` e suas tabelas.
4. Confira se as tabelas foram criadas.

A tabela de sessões é criada automaticamente pelo pacote `express-mysql-session` quando o servidor iniciar.

## 4. Como configurar o projeto

Abra a pasta do projeto no VS Code e use o terminal integrado.

Instale as dependências:

```bash
npm install
```

Crie uma cópia do arquivo `.env.example` e renomeie a cópia para `.env`.

No `.env`, informe os dados do seu MySQL:

```env
PORT=3000
SESSION_SECRET=coloque-uma-chave-grande-e-diferente
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=carbonmob

GASOLINE_FACTOR=2.2
ETHANOL_FACTOR=0.2
DIESEL_FACTOR=2.6
BUS_DIESEL_KM_PER_L=2.5
BUS_AVERAGE_PASSENGERS=30
```

Não envie o arquivo `.env` para o GitHub. Ele contém a senha do banco e a chave da sessão.

## 5. Como iniciar

Com o MySQL ligado e o arquivo `.env` configurado, execute:

```bash
npm start
```

Depois abra no navegador:

```text
http://localhost:3000
```

Para parar o servidor, volte ao terminal e pressione `Ctrl + C`.

## 6. Como testar o mercado

1. Crie uma conta do tipo **Empresa**.
2. Entre nessa conta e abra **Mercado de créditos**.
3. Clique em **Anunciar créditos** e cadastre um projeto de demonstração.
4. Saia da conta.
5. Crie uma conta do tipo **Pessoa** ou outra empresa.
6. Entre, pesquise o projeto e faça uma compra de demonstração.
7. Confira a compra em **Meus créditos** e teste o registro de compensação.
8. Entre novamente na conta vendedora para consultar as vendas.

Uma empresa também pode comprar créditos de outra empresa.

## 7. Como os cálculos funcionam

### Carro e motocicleta

```text
Emissão (kg CO2) = (distância em km / consumo em km por litro) x fator do combustível
```

O sistema divide a emissão total pela quantidade de ocupantes para exibir a estimativa por pessoa. Os fatores que vieram da versão anterior do projeto continuam provisórios e estão configuráveis no `.env`.

### Ônibus de Campinas

A Transurc publicou uma referência de consumo de **2,5 km/L** para um ônibus convencional em uma linha de Campinas. O CarbonMob utiliza esse valor como referência inicial.

Para mostrar uma estimativa por passageiro, o sistema divide a emissão calculada do ônibus pela ocupação média configurada. O valor inicial de **30 passageiros** é uma hipótese de demonstração, não uma média oficial de todos os ônibus ou horários. Os dois valores podem ser alterados no `.env`.

Referência: https://www.transurc.com.br/responsabilidade-ambiental/

### Limitações dos cálculos

- Consumo, trânsito, tipo de ônibus, combustível e lotação variam na vida real.
- O fator de diesel usado nesta versão é o valor provisório que já existia no projeto.
- Os resultados são estimativas para fins escolares, não um inventário oficial de emissões.

## 8. Limites da lojinha nesta entrega

- As compras são registros demonstrativos no banco; não existe integração com cartão, Pix ou gateway de pagamento.
- A variação de preço é uma simulação simples para demonstrar oferta e procura, não uma bolsa de valores real.
- Os anúncios não são automaticamente certificados. Um mercado real precisaria verificar origem, titularidade, certificação e situação dos créditos antes de permitir a negociação.
- O valor de CO2 compensado por unidade é informado no anúncio de demonstração. Isso não substitui a aposentadoria oficial de um crédito em um registro reconhecido.

## 9. Próxima etapa: hospedagem

O projeto já está preparado para receber as configurações de um banco MySQL remoto por variáveis de ambiente. Na próxima etapa, será necessário criar o banco online, preencher as variáveis no serviço de hospedagem e publicar o servidor Node.js. Não coloque senhas diretamente nos arquivos do projeto.
