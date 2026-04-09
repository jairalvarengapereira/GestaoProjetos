# Fluxo Pro - Gestão de Projetos

<p align="center">
  <img src="frontend/public/FluxoPro.png" alt="Fluxo Pro" width="120" />
</p>

Aplicação web completa para gestão de projetos e catálogo de infraestrutura, permitindo armazenar e gerenciar informações técnicas de sistemas, incluindo URLs, APIs, bancos de dados e credenciais.

## Funcionalidades

### Autenticação e Gerenciamento de Usuários

- Login seguro com JWT
- Sistema de convites para novos usuários (token válido por 7 dias)
- Perfil do usuário com opção de alteração de dados e senha
- Controle de acesso por empresa

### Gerenciamento de Projetos/Sistemas

- Cadastro completo de sistemas com:
  - Nome e tecnologia utilizada
  - Ambiente (Desenvolvimento, Homologação, Produção)
  - Status (Ativo, Inativo, Manutenção)
  - URL da aplicação
  - URLs da API Base e documentação (Swagger)
  - Informações do banco de dados (host, porta, nome, usuário, senha)
  - String de conexão (oculta por segurança)
  - Observações

### Interface

- Design responsivo com Tailwind CSS
- Busca por nome ou tecnologia
- Modal para cadastro/edição de sistemas
- Cópia de strings de conexão para área de transferência
- Indicadores visuais de ambiente e status

## Tecnologias

### Frontend

- React 18
- Vite
- Tailwind CSS
- Lucide React (ícones)

### Backend

- Node.js
- Express
- PostgreSQL (via pg)
- JWT (autenticação)
- bcryptjs (criptografia de senhas)

## Estrutura do Projeto

```
/
├── frontend/           # Frontend React
│   ├── public/         # Arquivos públicos (ícones, manifest)
│   ├── src/           # Código fonte React
│   ├── index.html     # Arquivo HTML principal
│   ├── vite.config.js # Configuração Vite
│   └── package.json   # Dependências frontend
│
├── backend/           # Backend Node.js
│   ├── server.js      # Servidor principal
│   ├── database/     # Arquivos do banco de dados
│   └── package.json  # Dependências backend
│
├── docker-compose.yml # Orquestração Docker
├── Dockerfile        # Configuração Docker
└── README.md         # Este arquivo
```

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- Docker e Docker Compose (opcional)

## Instalação

### Usando Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/jairalvarengapereira/GestaoProjetos.git
cd GestaoProjetos

# Inicie os containers
docker-compose up -d
```

### Instalação Manual

#### Backend

```bash
cd backend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Inicie o servidor
node server.js
```

#### Frontend

```bash
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

## Variáveis de Ambiente

### Backend (.env)

```env
PORT=8080
DATABASE_URL=postgresql://usuario:senha@localhost:5432/fluxopro
JWT_SECRET=sua-chave-secreta-aqui
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8080
```

## Deploy

### Backend (Railway/Render/Fly.io)

1. Crie um banco de dados PostgreSQL
2. Configure as variáveis de ambiente
3. Faça o deploy do código

### Frontend (Netlify/Vercel)

O frontend está configurado para deploy no Netlify. Após push para o GitHub:

1. Conecte o repositório no Netlify
2. Configure o build:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Adicione a variável de ambiente `VITE_API_URL` com a URL da API

## Acesso Inicial

Após a primeira execução, um usuário administrador é criado automaticamente:

- **E-mail:** admin@fluxopro.com
- **Senha:** admin123

**Recomendação:** Altere a senha do administrador após o primeiro login.

## API Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/login | Login de usuário |
| POST | /api/usuarios | Criar novo usuário |
| GET | /api/usuarios/:id | Buscar usuário |
| PUT | /api/usuarios/:id | Atualizar usuário |

### Empresas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/empresas | Listar empresas |
| POST | /api/empresas | Criar empresa |

### Sistemas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/sistemas | Listar sistemas |
| GET | /api/sistemas/:id | Buscar sistema |
| POST | /api/sistemas | Criar sistema |
| PUT | /api/sistemas/:id | Atualizar sistema |
| DELETE | /api/sistemas/:id | Excluir sistema |

### Convites

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/convites | Listar convites |
| POST | /api/convites | Criar convite |
| GET | /api/convites/:token | Validar convite |
| POST | /api/convites/usar | Utilizar convite |

## Segurança

- Senhas criptografadas com bcrypt
- Autenticação via JWT com expiração de 24h
- Dados sensíveis (senhas, strings de conexão) armazenados de forma segura
- Validação de tokens em todas as requisições protegidas

## Screenshots

A interface conta com:
- Tela de login limpa e intuitiva
- Dashboard com cards de projetos
- Modal de cadastro/edição completo
- Sistema de busca integrada

## Licença

Todos os direitos reservados © 2026 Jair Alvarenga Pereira.

## Contato

Desenvolvido por Jair Alvarenga Pereira
