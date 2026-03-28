require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'infra-catalogo-secret-key-2024';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(cors());
app.use(express.json());

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        plano TEXT DEFAULT 'basico',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'usuario',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sistemas (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER,
        nome TEXT NOT NULL,
        ambiente TEXT NOT NULL CHECK(ambiente IN ('Desenvolvimento', 'Homologação', 'Produção')),
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
        status TEXT DEFAULT 'Ativo' CHECK(status IN ('Ativo', 'Inativo', 'Manutenção')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS convites (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        usado BOOLEAN DEFAULT FALSE,
        criado_por INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id),
        FOREIGN KEY (criado_por) REFERENCES usuarios(id)
      )
    `);

    const result = await client.query("SELECT COUNT(*) as count FROM empresas");
    if (parseInt(result.rows[0].count) === 0) {
      await client.query("INSERT INTO empresas (nome, slug, plano) VALUES ('Empresa Principal', 'empresa-principal', 'profissional')");
    }

    const userResult = await client.query("SELECT COUNT(*) as count FROM usuarios WHERE role = 'admin'");
    if (parseInt(userResult.rows[0].count) === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await client.query(
        "INSERT INTO usuarios (empresa_id, nome, email, password, role) VALUES (1, 'Administrador', 'admin@fluxopro.com', $1, 'admin')",
        [hashedPassword]
      );
      console.log('Usuário admin criado: admin@fluxopro.com / admin123');
    }

    console.log('Banco de dados inicializado com PostgreSQL');
  } catch (err) {
    console.error('Erro ao inicializar banco:', err);
  } finally {
    client.release();
  }
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

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    const usuario = result.rows[0];
    
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const valid = bcrypt.compareSync(password || '', usuario.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const empresaResult = await pool.query("SELECT * FROM empresas WHERE id = $1", [usuario.empresa_id]);
    const empresa = empresaResult.rows[0];
    
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.get('/api/empresas', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nome, slug, plano FROM empresas ORDER BY nome");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar empresas' });
  }
});

app.post('/api/empresas', async (req, res) => {
  const { nome, slug, plano } = req.body;
  
  if (!nome || !slug) {
    return res.status(400).json({ error: 'Nome e slug são obrigatórios' });
  }
  
  try {
    const existing = await pool.query("SELECT * FROM empresas WHERE slug = $1", [slug]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Slug já existe' });
    }
    
    const result = await pool.query(
      "INSERT INTO empresas (nome, slug, plano) VALUES ($1, $2, $3) RETURNING *",
      [nome, slug, plano || 'basico']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar empresa' });
  }
});

app.post('/api/usuarios', async (req, res) => {
  const { nome, email, password, empresa_id } = req.body;
  
  if (!nome || !email || !password || !empresa_id) {
    return res.status(400).json({ error: 'Nome, e-mail, senha e empresa são obrigatórios' });
  }
  
  try {
    const existing = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }
    
    const empresaResult = await pool.query("SELECT * FROM empresas WHERE id = $1", [empresa_id]);
    if (empresaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    await pool.query(
      "INSERT INTO usuarios (empresa_id, nome, email, password, role) VALUES ($1, $2, $3, $4, 'usuario')",
      [empresa_id, nome, email, hashedPassword]
    );
    
    res.status(201).json({ message: 'Usuário criado com sucesso', email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.get('/api/usuarios/:id', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  try {
    const result = await pool.query("SELECT id, empresa_id, nome, email, role FROM usuarios WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

app.put('/api/usuarios/:id', authenticateToken, async (req, res) => {
  const { nome, email, password } = req.body;
  const userId = parseInt(req.params.id);
  
  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Você não pode alterar dados de outro usuário' });
  }
  
  if (!nome || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
  }
  
  try {
    const usuario = await pool.query("SELECT * FROM usuarios WHERE id = $1", [userId]);
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const existing = await pool.query("SELECT * FROM usuarios WHERE email = $1 AND id != $2", [email, userId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'E-mail já está em uso' });
    }
    
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await pool.query(
        "UPDATE usuarios SET nome = $1, email = $2, password = $3 WHERE id = $4",
        [nome, email, hashedPassword, userId]
      );
    } else {
      await pool.query(
        "UPDATE usuarios SET nome = $1, email = $2 WHERE id = $3",
        [nome, email, userId]
      );
    }
    
    res.json({ message: 'Dados atualizados com sucesso', nome, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.get('/api/sistemas', authenticateToken, async (req, res) => {
  const { busca } = req.query;
  const empresaId = req.user.empresa_id;
  
  try {
    let sql = "SELECT * FROM sistemas WHERE empresa_id = $1";
    let params = [empresaId];
    
    if (busca) {
      sql += " AND (nome LIKE $2 OR tecnologia LIKE $2)";
      params.push(`%${busca}%`);
    }
    
    sql += " ORDER BY nome";
    
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar sistemas' });
  }
});

app.get('/api/sistemas/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sistemas WHERE id = $1 AND empresa_id = $2", [req.params.id, req.user.empresa_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sistema não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar sistema' });
  }
});

app.post('/api/sistemas', authenticateToken, async (req, res) => {
  const { nome, ambiente, url_aplicacao, api_base_url, api_doc_url, db_host, db_port, db_name, db_user, db_password, string_conexao, tecnologia, observacoes, status } = req.body;
  
  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO sistemas (empresa_id, nome, ambiente, url_aplicacao, api_base_url, api_doc_url, db_host, db_port, db_name, db_user, db_password, string_conexao, tecnologia, observacoes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [req.user.empresa_id, nome, ambiente, url_aplicacao, api_base_url, api_doc_url, db_host, db_port, db_name, db_user, db_password, string_conexao, tecnologia, observacoes, status || 'Ativo']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar sistema' });
  }
});

app.put('/api/sistemas/:id', authenticateToken, async (req, res) => {
  const { nome, ambiente, url_aplicacao, api_base_url, api_doc_url, db_host, db_port, db_name, db_user, db_password, string_conexao, tecnologia, observacoes, status } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE sistemas SET nome = $1, ambiente = $2, url_aplicacao = $3, api_base_url = $4, api_doc_url = $5, db_host = $6, db_port = $7, db_name = $8, db_user = $9, db_password = $10, string_conexao = $11, tecnologia = $12, observacoes = $13, status = $14, updated_at = CURRENT_TIMESTAMP
       WHERE id = $15 AND empresa_id = $16 RETURNING *`,
      [nome, ambiente, url_aplicacao, api_base_url, api_doc_url, db_host, db_port, db_name, db_user, db_password, string_conexao, tecnologia, observacoes, status, req.params.id, req.user.empresa_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sistema não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar sistema' });
  }
});

app.delete('/api/sistemas/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM sistemas WHERE id = $1 AND empresa_id = $2", [req.params.id, req.user.empresa_id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Sistema não encontrado' });
    }
    
    res.json({ message: 'Sistema deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar sistema' });
  }
});

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function ensureConvitesTable(callback) {
  pool.query(`
    CREATE TABLE IF NOT EXISTS convites (
      id SERIAL PRIMARY KEY,
      empresa_id INTEGER,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      usado BOOLEAN DEFAULT FALSE,
      criado_por INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id),
      FOREIGN KEY (criado_por) REFERENCES usuarios(id)
    )
  `).then(() => callback()).catch(err => {
    console.error('Erro ao criar tabela convites:', err);
    callback();
  });
}

app.post('/api/convites', authenticateToken, async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }
  
  try {
    ensureConvitesTable(async () => {
      const token = generateToken();
      
      const result = await pool.query(
        "INSERT INTO convites (empresa_id, email, token, criado_por) VALUES ($1, $2, $3, $4) RETURNING *",
        [req.user.empresa_id, email, token, req.user.id]
      );
      
      res.status(201).json({ 
        message: 'Convite criado com sucesso',
        token: result.rows[0].token,
        email,
        link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cadastro?token=${token}`
      });
    });
  } catch (err) {
    console.error('Erro ao criar convite:', err);
    res.status(500).json({ error: 'Erro ao criar convite' });
  }
});

app.get('/api/convites/:token', async (req, res) => {
  ensureConvitesTable(async () => {
    const { token } = req.params;
    
    try {
      const result = await pool.query(
        "SELECT c.*, e.nome as empresa_nome FROM convites c JOIN empresas e ON c.empresa_id = e.id WHERE c.token = $1 AND c.usado = FALSE",
        [token]
      );
      
      const convite = result.rows[0];
      
      if (!convite) {
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
    } catch (err) {
      res.status(500).json({ error: 'Erro ao validar convite' });
    }
  });
});

app.post('/api/convites/usar', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token é obrigatório' });
  }
  
  ensureConvitesTable(async () => {
    try {
      const result = await pool.query("SELECT * FROM convites WHERE token = $1 AND usado = FALSE", [token]);
      const convite = result.rows[0];
      
      if (!convite) {
        return res.status(404).json({ error: 'Convite inválido ou já utilizado' });
      }
      
      const created = new Date(convite.created_at);
      const now = new Date();
      const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 7) {
        return res.status(400).json({ error: 'Convite expirado' });
      }
      
      await pool.query("UPDATE convites SET usado = TRUE WHERE id = $1", [convite.id]);
      
      res.json({ 
        message: 'Convite válido',
        empresa_id: convite.empresa_id,
        email: convite.email
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao utilizar convite' });
    }
  });
});

app.get('/api/convites', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT c.*, e.nome as empresa_nome FROM convites c JOIN empresas e ON c.empresa_id = e.id WHERE c.empresa_id = $1 ORDER BY c.created_at DESC",
      [req.user.empresa_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar convites' });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
  });
});
