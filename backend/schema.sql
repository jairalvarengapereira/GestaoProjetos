-- Schema do Banco de Dados - Gestão de Projetos

-- Tabela de Empresas
CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plano TEXT DEFAULT 'basico',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'usuario',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Sistemas/Projetos
CREATE TABLE IF NOT EXISTS sistemas (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id),
    nome TEXT NOT NULL,
    ambiente TEXT NOT NULL CHECK (ambiente IN ('Desenvolvimento', 'Homologação', 'Produção')),
    url_aplicacao TEXT,
    api_base_url TEXT,
    api_doc_url TEXT,
    db_host TEXT,
    db_port INTEGER,
    db_name TEXT,
    db_user TEXT,
    db_password TEXT,
    string_conexao TEXT,
    tecnologia TEXT,
    observacoes TEXT,
    status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Manutenção')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Convites
CREATE TABLE IF NOT EXISTS convites (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id),
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    criado_por INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir empresa padrão
INSERT INTO empresas (nome, slug, plano) 
SELECT 'Empresa Principal', 'empresa-principal', 'profissional'
WHERE NOT EXISTS (SELECT 1 FROM empresas WHERE slug = 'empresa-principal');
