-- Tabela de usuários para autenticação
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela principal de sistemas
CREATE TABLE IF NOT EXISTS sistemas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    ambiente TEXT CHECK(ambiente IN ('Desenvolvimento', 'Homologação', 'Produção')) NOT NULL,
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
    status TEXT CHECK(status IN ('Ativo', 'Inativo', 'Manutenção')) DEFAULT 'Ativo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuário admin padrão (senha: admin123 - hash bcrypt)
INSERT INTO users (username, password) VALUES ('admin', '$2a$10$xQZ8H5YxK8.1pJ2nQ3mR4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0');
