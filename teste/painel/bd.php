<?php
declare(strict_types=1);
/* BANCO: criação das tabelas (instalar). */

/* Cria as tabelas sozinho na primeira vez. Para adicionar uma coluna nova no futuro, coloque uma linha na lista
   de colunas logo abaixo das tabelas ([tabela, coluna, tipo]). O painel faz o ALTER TABLE sozinho, sem precisar do phpMyAdmin. */
function instalar(): void {
    $c = cfg();
    $sqlite = ($c['driver'] ?? 'mysql') === 'sqlite';
    $pk = $sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
    $fim = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    $db = db();
    $db->exec("CREATE TABLE IF NOT EXISTS usuarios (id $pk, usuario VARCHAR(60) NOT NULL, senha VARCHAR(255) NOT NULL, criado_em VARCHAR(19))$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS tentativas (id $pk, ip VARCHAR(45), quando INT)$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS produtos (id $pk, codigo VARCHAR(40) DEFAULT '', nome VARCHAR(160) NOT NULL, preco DECIMAL(10,2) DEFAULT 0, controla TINYINT DEFAULT 1, estoque INT DEFAULT 0, ativo TINYINT DEFAULT 1, obs VARCHAR(255) DEFAULT '')$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS pedidos (id $pk, data VARCHAR(10), cliente VARCHAR(120), whatsapp VARCHAR(30) DEFAULT '', pagamento VARCHAR(30) DEFAULT '', pago TINYINT DEFAULT 0, entrega VARCHAR(20) DEFAULT 'Retirada', endereco VARCHAR(255) DEFAULT '', prazo VARCHAR(60) DEFAULT '', obs TEXT, desconto DECIMAL(10,2) DEFAULT 0, frete DECIMAL(10,2) DEFAULT 0, total DECIMAL(10,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'novo', criado_em VARCHAR(19))$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS itens (id $pk, pedido_id INT NOT NULL, produto_id INT NULL, descricao VARCHAR(200), qtd INT DEFAULT 1, preco DECIMAL(10,2) DEFAULT 0)$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS cores (id $pk, nome VARCHAR(40) NOT NULL, hex VARCHAR(7) DEFAULT '#cccccc')$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS produto_cores (id $pk, produto_id INT NOT NULL, cor_id INT NOT NULL, qtd INT DEFAULT 0)$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS auditoria (id $pk, quando VARCHAR(19), usuario VARCHAR(60) DEFAULT '', ip VARCHAR(45) DEFAULT '', acao VARCHAR(40), alvo VARCHAR(200) DEFAULT '', detalhe TEXT)$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS dispositivos (id $pk, hash VARCHAR(64) NOT NULL, usuario VARCHAR(60), primeiro VARCHAR(19), ultimo VARCHAR(19), ip VARCHAR(45), agente VARCHAR(160))$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS categorias (id $pk, nome VARCHAR(80) NOT NULL, parent_id INT NULL, ordem INT DEFAULT 0, ativo TINYINT DEFAULT 1)$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS produto_categorias (produto_id INT NOT NULL, categoria_id INT NOT NULL, PRIMARY KEY (produto_id, categoria_id))$fim");
    /* colunas novas em tabelas que já existiam (banco criado antes das cores) */
    $db->exec("CREATE TABLE IF NOT EXISTS clientes (id $pk, nome VARCHAR(120) NOT NULL, telefone VARCHAR(30) DEFAULT '', endereco VARCHAR(255) DEFAULT '', cidade VARCHAR(80) DEFAULT '', obs VARCHAR(255) DEFAULT '', criado_em VARCHAR(19))$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS metricas (dia VARCHAR(10) NOT NULL, tipo VARCHAR(20) NOT NULL, chave VARCHAR(40) NOT NULL, qtd INT NOT NULL DEFAULT 0, PRIMARY KEY (dia, tipo, chave))$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS parametros (chave VARCHAR(40) NOT NULL PRIMARY KEY, valor VARCHAR(40) NOT NULL)$fim");
    /* orçamentos (viram pedido com um botão), convites e links de senha */
    $db->exec("CREATE TABLE IF NOT EXISTS orcamentos (id $pk, data VARCHAR(10), validade VARCHAR(10) DEFAULT '', cliente VARCHAR(120), cliente_id INT NULL, whatsapp VARCHAR(30) DEFAULT '', entrega VARCHAR(20) DEFAULT 'Retirada', endereco VARCHAR(255) DEFAULT '', prazo VARCHAR(60) DEFAULT '', obs TEXT, desconto DECIMAL(10,2) DEFAULT 0, frete DECIMAL(10,2) DEFAULT 0, total DECIMAL(10,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'aberto', pedido_id INT NULL, criado_em VARCHAR(19))$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS orcamento_itens (id $pk, orcamento_id INT NOT NULL, produto_id INT NULL, cor_id INT NULL, cor VARCHAR(40) DEFAULT '', descricao VARCHAR(200), qtd INT DEFAULT 1, preco DECIMAL(10,2) DEFAULT 0, tipo VARCHAR(40) DEFAULT '', detalhes VARCHAR(255) DEFAULT '', custo DECIMAL(10,2) DEFAULT 0)$fim");
    $db->exec("CREATE TABLE IF NOT EXISTS tokens (id $pk, tipo VARCHAR(10) NOT NULL, hash VARCHAR(64) NOT NULL, usuario_id INT NULL, email VARCHAR(120) DEFAULT '', perfil VARCHAR(20) DEFAULT '', expira INT NOT NULL, usado TINYINT DEFAULT 0, criado_em VARCHAR(19))$fim");
    /* REGISTRO DE MUDANÇAS DO BANCO: a tabela "migracoes" lembra o que já foi aplicado, então cada mudança roda uma vez só.
       Para criar uma coluna nova, acrescente [tabela, coluna, tipo] na lista abaixo. Para uma mudança que não é coluna, use MIGRACOES_SQL (no fim deste arquivo). */
    $db->exec("CREATE TABLE IF NOT EXISTS migracoes (id VARCHAR(80) NOT NULL PRIMARY KEY, descricao VARCHAR(200), aplicada_em VARCHAR(19))$fim");
    $feitas = $db->query('SELECT id FROM migracoes')->fetchAll(PDO::FETCH_COLUMN);
    $registra = fn(string $id, string $desc) => $db->prepare('INSERT INTO migracoes (id, descricao, aplicada_em) VALUES (?,?,?)')->execute([$id, $desc, date('Y-m-d H:i:s')]);
    foreach ([['produtos', 'usa_cores', 'TINYINT DEFAULT 0'], ['itens', 'cor_id', 'INT NULL'], ['itens', 'cor', "VARCHAR(40) DEFAULT ''"],
              ['produtos', 'peso_g', 'DECIMAL(10,2) DEFAULT 0'], ['produtos', 'tempo_min', 'INT DEFAULT 0'], ['produtos', 'material', "VARCHAR(10) DEFAULT 'PLA'"],
              ['produtos', 'perda_pct', 'DECIMAL(5,2) DEFAULT 10'], ['produtos', 'extras', 'DECIMAL(10,2) DEFAULT 0'],
              ['produtos', 'embalagem', 'DECIMAL(10,2) DEFAULT 0.80'], ['produtos', 'custo', 'DECIMAL(10,2) DEFAULT 0'], ['produtos', 'preco_kg', 'DECIMAL(10,2) DEFAULT 0'], ['pedidos', 'cliente_id', 'INT NULL'], ['itens', 'tipo', "VARCHAR(40) DEFAULT ''"], ['itens', 'detalhes', "VARCHAR(255) DEFAULT ''"], ['itens', 'custo', 'DECIMAL(10,2) DEFAULT 0'],
              ['pedidos', 'pago_valor', 'DECIMAL(10,2) DEFAULT 0'], ['usuarios', 'nome', "VARCHAR(80) DEFAULT ''"], ['usuarios', 'email', "VARCHAR(120) DEFAULT ''"],
              ['usuarios', 'perfil', "VARCHAR(20) DEFAULT 'admin'"], ['usuarios', 'ativo', 'TINYINT DEFAULT 1']] as [$tab, $col, $def]) {
        $id = "coluna:$tab.$col"; if (in_array($id, $feitas, true)) continue;
        try { $db->query("SELECT $col FROM $tab LIMIT 1")->fetchAll(); }
        catch (Throwable $e) { $db->exec("ALTER TABLE $tab ADD COLUMN $col $def"); }
        $registra($id, "coluna $col em $tab");
    }
    foreach (MIGRACOES_SQL as $id => [$desc, $sql]) {
        if (in_array($id, $feitas, true)) continue;
        $db->exec($sql); $registra($id, $desc);
    }
}

/* Mudanças de banco que não são "coluna nova". Formato: 'numero-curto' => ['o que faz', 'SQL']. Cada uma roda uma única vez. Hoje não há nenhuma pendente. */
const MIGRACOES_SQL = [];
