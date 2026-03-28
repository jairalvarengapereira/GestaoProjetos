const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'infra-catalogo-secret-key-2024';
const DB_PATH = path.join(__dirname, 'database', 'infra.db');

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar no banco:', err.message);
  } else {
    console.log('Conectado ao banco SQLite');
  }
});

function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS empresas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      plano TEXT DEFAULT 'basico',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'usuario',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='convites'", (err, rows) => {
      if (rows.length === 0) {
        db.run(`CREATE TABLE IF NOT EXISTS convites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          empresa_id INTEGER,
          email TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          usado INTEGER DEFAULT 0,
          criado_por INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (empresa_id) REFERENCES empresas(id),
          FOREIGN KEY (criado_por) REFERENCES usuarios(id)
        )`);
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS sistemas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER,
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    db.get("SELECT COUNT(*) as count FROM empresas", (err, row) => {
      if (row.count === 0) {
        db.run("INSERT INTO empresas (nome, slug, plano) VALUES ('Empresa Principal', 'empresa-principal', 'profissional')");
      }
    });
  });
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get("SELECT * FROM usuarios WHERE email = ?", [email], (err, usuario) => {
    if (err || !usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const valid = bcrypt.compareSync(password || '', usuario.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    db.get("SELECT * FROM empresas WHERE id = ?", [usuario.empresa_id], (err, empresa) => {
      if (!empresa) {
        return res.status(500).json({ error: 'Empresa não encontrada' });
      }
      
      const token = jwt.sign(
        { id: usuario.id, nome: usuario.nome, email: usuario.email, empresa_id: usuario.empresa_id, role: usuario.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        token,
        nome: usuario.nome,
        email: usuario.email,
        empresa: { id: empresa.id, nome: empresa.nome, slug: empresa.slug, plano: empresa.plano }
      });
    });
  });
});

app.get('/api/empresas', (req, res) => {
  db.all("SELECT id, nome, slug, plano FROM empresas ORDER BY nome", (err, empresas) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar empresas' });
    res.json(empresas);
  });
});

app.post('/api/empresas', (req, res) => {
  const { nome, slug, plano } = req.body;
  
  if (!nome || !slug) {
    return res.status(400).json({ error: 'Nome e slug são obrigatórios' });
  }
  
  db.get("SELECT * FROM empresas WHERE slug = ?", [slug], (err, existing) => {
    if (existing) {
      return res.status(400).json({ error: 'Slug já existe' });
    }
    
    db.run(
      "INSERT INTO empresas (nome, slug, plano) VALUES (?, ?, ?)",
      [nome, slug, plano || 'basico'],
      function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao criar empresa' });
        res.status(201).json({ id: this.lastID, nome, slug, plano: plano || 'basico' });
      }
    );
  });
});

app.post('/api/usuarios', (req, res) => {
  const { nome, email, password, empresa_id } = req.body;
  
  if (!nome || !email || !password || !empresa_id) {
    return res.status(400).json({ error: 'Nome, e-mail, senha e empresa são obrigatórios' });
  }
  
  db.get("SELECT * FROM usuarios WHERE email = ?", [email], (err, existing) => {
    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }
    
    db.get("SELECT * FROM empresas WHERE id = ?", [empresa_id], (err, empresa) => {
      if (!empresa) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }
      
      const hashedPassword = bcrypt.hashSync(password, 10);
      
      db.run(
        "INSERT INTO usuarios (empresa_id, nome, email, password, role) VALUES (?, ?, ?, ?, 'usuario')",
        [empresa_id, nome, email, hashedPassword],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Erro ao criar usuário' });
          }
          res.status(201).json({ message: 'Usuário criado com sucesso', email });
        }
      );
    });
  });
});

app.put('/api/usuarios/:id', authenticateToken, (req, res) => {
  const { nome, email, password } = req.body;
  const userId = parseInt(req.params.id);
  
  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Você não pode alterar dados de outro usuário' });
  }
  
  if (!nome || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
  }
  
  db.get("SELECT * FROM usuarios WHERE id = ?", [userId], (err, usuario) => {
    if (err || !usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    db.get("SELECT * FROM usuarios WHERE email = ? AND id != ?", [email, userId], (err, existing) => {
      if (existing) {
        return res.status(400).json({ error: 'E-mail já está em uso' });
      }
      
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.run(
          "UPDATE usuarios SET nome = ?, email = ?, password = ? WHERE id = ?",
          [nome, email, hashedPassword, userId],
          function(err) {
            if (err) return res.status(500).json({ error: 'Erro ao atualizar usuário' });
            res.json({ message: 'Dados atualizados com sucesso', nome, email });
          }
        );
      } else {
        db.run(
          "UPDATE usuarios SET nome = ?, email = ? WHERE id = ?",
          [nome, email, userId],
          function(err) {
            if (err) return res.status(500).json({ error: 'Erro ao atualizar usuário' });
            res.json({ message: 'Dados atualizados com sucesso', nome, email });
          }
        );
      }
    });
  });
});

app.get('/api/usuarios/:id', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  db.get("SELECT id, empresa_id, nome, email, role FROM usuarios WHERE id = ?", [userId], (err, usuario) => {
    if (err || !usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(usuario);
  });
});

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

app.post('/api/convites', authenticateToken, (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }
  
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='convites'", (err, rows) => {
    if (rows.length === 0) {
      db.run(`CREATE TABLE IF NOT EXISTS convites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        usado INTEGER DEFAULT 0,
        criado_por INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id),
        FOREIGN KEY (criado_por) REFERENCES usuarios(id)
      )`, (err) => {
        if (err) console.error('Erro ao criar tabela convites:', err);
      });
    }
  });
  
  setTimeout(() => {
    const token = generateToken();
    
    db.run(
      "INSERT INTO convites (empresa_id, email, token, criado_por) VALUES (?, ?, ?, ?)",
      [req.user.empresa_id, email, token, req.user.id],
      function(err) {
        if (err) {
          console.error('Erro ao criar convite:', err);
          return res.status(500).json({ error: 'Erro ao criar convite' });
        }
        res.status(201).json({ 
          message: 'Convite criado com sucesso',
          token,
          email,
          link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cadastro?token=${token}`
        });
      }
    );
  }, 100);
});

function ensureConvitesTable(callback) {
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='convites'", (err, rows) => {
    if (rows.length === 0) {
      db.run(`CREATE TABLE IF NOT EXISTS convites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        usado INTEGER DEFAULT 0,
        criado_por INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id),
        FOREIGN KEY (criado_por) REFERENCES usuarios(id)
      )`, (err) => {
        if (err) console.error('Erro ao criar tabela convites:', err);
        callback();
      });
    } else {
      callback();
    }
  });
}

app.get('/api/convites/:token', (req, res) => {
  ensureConvitesTable(() => {
    const { token } = req.params;
    
    db.get("SELECT c.*, e.nome as empresa_nome FROM convites c JOIN empresas e ON c.empresa_id = e.id WHERE c.token = ? AND c.usado = 0", [token], (err, convite) => {
      if (err || !convite) {
        return res.status(404).json({ error: 'Convite inválido ou já utilizado' });
      }
      
      const created = new Date(convite.created_at);
      const now = new Date();
      const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 7) {
        return res.status(400).json({ error: 'Convite expirado' });
      }
      
      res.json({ 
        email: convite.email, 
        empresa_id: convite.empresa_id,
        empresa_nome: convite.empresa_nome
      });
    });
  });
});

app.post('/api/convites/usar', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token é obrigatório' });
  }
  
  ensureConvitesTable(() => {
    db.get("SELECT * FROM convites WHERE token = ? AND usado = 0", [token], (err, convite) => {
      if (err || !convite) {
        return res.status(404).json({ error: 'Convite inválido ou já utilizado' });
      }
    
    const created = new Date(convite.created_at);
    const now = new Date();
    const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 7) {
      return res.status(400).json({ error: 'Convite expirado' });
    }
    
    db.run("UPDATE convites SET usado = 1 WHERE id = ?", [convite.id], (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao utilizar convite' });
      res.json({ 
        message: 'Convite válido',
        empresa_id: convite.empresa_id,
        email: convite.email
      });
    });
  });
  });
});

app.get('/api/convites', authenticateToken, (req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='convites'", (err, rows) => {
    if (rows.length === 0) {
      db.run(`CREATE TABLE IF NOT EXISTS convites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        usado INTEGER DEFAULT 0,
        criado_por INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id),
        FOREIGN KEY (criado_por) REFERENCES usuarios(id)
      )`, (err) => {
        if (err) console.error('Erro ao criar tabela convites:', err);
      });
    }
  });
  
  db.all("SELECT c.*, e.nome as empresa_nome FROM convites c JOIN empresas e ON c.empresa_id = e.id WHERE c.empresa_id = ? ORDER BY c.created_at DESC", [req.user.empresa_id], (err, convites) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar convites' });
    res.json(convites);
  });
});

app.get('/api/sistemas', authenticateToken, (req, res) => {
  const { busca } = req.query;
  const empresaId = req.user.empresa_id;
  
  let sql = "SELECT * FROM sistemas WHERE empresa_id = ?";
  let params = [empresaId];
  
  if (busca) {
    sql += " AND (nome LIKE ? OR tecnologia LIKE ?)";
    params.push(`%${busca}%`, `%${busca}%`);
  }
  
  sql += " ORDER BY nome";
  
  db.all(sql, params, (err, sistemas) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar sistemas' });
    res.json(sistemas);
  });
});

app.get('/api/sistemas/:id', authenticateToken, (req, res) => {
  db.get("SELECT * FROM sistemas WHERE id = ? AND empresa_id = ?", [req.params.id, req.user.empresa_id], (err, sistema) => {
    if (err || !sistema) return res.status(404).json({ error: 'Sistema não encontrado' });
    res.json(sistema);
  });
});

app.post('/api/sistemas', authenticateToken, (req, res) => {
  const { nome, ambiente, url_aplicacao, api_base_url, api_doc_url, db_host, db_port, db_name, db_user, db_password, string_conexao, tecnologia, observacoes, status } = req.body;
  
  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  
  db.run(
    `INSERT INTO sistemas (empresa_id, nome, ambiente, url_aplicacao, api_base_url, api_doc_url, db_host, db_port, db_name, db_user, db_password, string_conexao, tecnologia, observacoes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.empresa_id, nome, ambiente, url_aplicacao, api_base_url, api_doc_url, db_host, db_port, db_name, db_user, db_password, string_conexao, tecnologia, observacoes, status || 'Ativo'],
    function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao criar sistema' });
      res.status(201).json({ id: this.lastID, empresa_id: req.user.empresa_id, nome, ambiente, status: status || 'Ativo' });
    }
  );
});

app.put('/api/sistemas/:id', authenticateToken, (req, res) => {
  const { nome, ambiente, url_aplicacao, api_base_url, api_doc_url, db_host, db_port, db_name, db_user, db_password, string_conexao, tecnologia, observacoes, status } = req.body;
  
  db.run(
    `UPDATE sistemas SET nome = ?, ambiente = ?, url_aplicacao = ?, api_base_url = ?, api_doc_url = ?, db_host = ?, db_port = ?, db_name = ?, db_user = ?, db_password = ?, string_conexao = ?, tecnologia = ?, observacoes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND empresa_id = ?`,
    [nome, ambiente, url_aplicacao, api_base_url, api_doc_url, db_host, db_port, db_name, db_user, db_password, string_conexao, tecnologia, observacoes, status, req.params.id, req.user.empresa_id],
    function(err) {
      if (err || this.changes === 0) return res.status(404).json({ error: 'Sistema não encontrado' });
      res.json({ id: parseInt(req.params.id), nome, ambiente, status });
    }
  );
});

app.delete('/api/sistemas/:id', authenticateToken, (req, res) => {
  db.run("DELETE FROM sistemas WHERE id = ? AND empresa_id = ?", [req.params.id, req.user.empresa_id], function(err) {
    if (err || this.changes === 0) return res.status(404).json({ error: 'Sistema não encontrado' });
    res.json({ message: 'Sistema deletado com sucesso' });
  });
});

initDB();
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
