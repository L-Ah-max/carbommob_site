# Publicar o CarbonMob (Node + EJS) no Render

Este projeto e um servidor so (as paginas EJS ja saem do Node). Entao basta:
1 servico no Render + 1 banco MySQL na nuvem. Nao precisa de Firebase.
Confira os limites dos planos gratuitos na hora de criar as contas.

## 1) Banco MySQL na nuvem (TiDB Cloud Starter)
1. Crie o cluster gratuito e clique em "Connect". Anote: host, porta (4000), usuario e senha.
2. Conecte pelo MySQL Workbench (nova conexao, ative SSL) usando esses dados.
3. Rode, nesta ordem:
       CREATE DATABASE IF NOT EXISTS carbonmob;
       USE carbonmob;
   e depois abra database/banco_nuvem.sql e execute o arquivo inteiro.
4. Confira se as 7 tabelas apareceram (usuarios, deslocamentos, creditos, compras,
   historico_precos, metas, compensacoes). A tabela de sessoes o proprio sistema cria.

## 2) Codigo no GitHub
A raiz do repositorio precisa ser a pasta que tem o package.json.
No terminal, dentro de CarbonMob_Sprint5_HTML:
    git init
    git add .
    git commit -m "CarbonMob"
    git branch -M main
    git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
    git push -u origin main
O .gitignore ja impede de enviar o .env e o node_modules.
Confira no GitHub se aparecem as pastas config, routes, views, middleware e o arquivo server.js.
Apague do repositorio qualquer arquivo com senha (ex.: ".env verdadeiro.example").

## 3) Web Service no Render
- New > Web Service > escolha o repositorio
- Root Directory: vazio (se a raiz do repositorio ja e a pasta do projeto)
- Build Command: npm install
- Start Command: npm start
- Plano: Free
- Environment (variaveis):
    DB_HOST, DB_PORT=4000, DB_USER, DB_PASSWORD, DB_NAME=carbonmob
    DB_SSL=true
    SESSION_SECRET=(uma frase longa e aleatoria)
    NODE_ENV=production
    GASOLINE_FACTOR, ETHANOL_FACTOR, DIESEL_FACTOR, BUS_DIESEL_KM_PER_L, BUS_AVERAGE_PASSENGERS
    (copie os valores do seu .env)

## 4) Como saber se deu certo
No log do Render devem aparecer:
    Conexao com o banco de dados realizada.
    CarbonMob rodando em http://localhost:10000
Depois abra o endereco do servico: deve aparecer a tela de login.
O plano gratuito dorme apos 15 min parado e leva cerca de 1 min para acordar:
abra o link uns 10 minutos antes da apresentacao.
