<?php
declare(strict_types=1);
/*
 * SEGURANÇA E HISTÓRICO do painel (arquivo separado para ficar fácil de achar).
 *  - auditar(): grava no histórico quem fez o quê e quando.
 *  - auditarRequisicao(): grava sozinho toda mudança feita no painel (ver o roteador no api.php).
 *  - enviarAviso(): manda e-mail de segurança (tentativas erradas, acesso novo, senha trocada).
 *  - registrarDispositivo(): lembra dos aparelhos que já entraram, para avisar de um aparelho novo.
 * Os dados ficam nas tabelas "auditoria" e "dispositivos" (criadas no instalar() do api.php).
 * O e-mail que recebe os avisos NÃO fica no código (o repositório é público): é digitado no painel, em Ajustes.
 */

/* ---------- histórico ---------- */
function auditar(string $acao, string $alvo = '', string $detalhe = '', ?string $usuario = null): void {
    try {
        $u = $usuario ?? (string)($_SESSION['usuario'] ?? '');
        db()->prepare('INSERT INTO auditoria (quando, usuario, ip, acao, alvo, detalhe) VALUES (?,?,?,?,?,?)')
            ->execute([date('Y-m-d H:i:s'), mb_substr($u, 0, 60), ipCliente(), mb_substr($acao, 0, 40), mb_substr($alvo, 0, 200), mb_substr($detalhe, 0, 1500)]);
    } catch (Throwable $e) { /* o histórico nunca pode derrubar o painel */ }
}

/* Nome de cada ação, como aparece na tela do histórico. */
const ROTULOS_ACAO = [
    'produto_salvar' => 'Item salvo', 'produto_ajustar' => 'Estoque ajustado', 'produto_excluir' => 'Item excluído', 'produto_importar' => 'Itens importados do catálogo',
    'custos_importar' => 'Custos importados', 'parametros_salvar' => 'Parâmetros de custo salvos',
    'cor_salvar' => 'Cor salva', 'cor_excluir' => 'Cor excluída',
    'cliente_salvar' => 'Cliente salvo', 'cliente_excluir' => 'Cliente excluído',
    'pedido_salvar' => 'Pedido salvo', 'pedido_status' => 'Pedido: status/pagamento',
    'categoria_salvar' => 'Categoria salva', 'categoria_excluir' => 'Categoria excluída', 'categoria_ordenar' => 'Categoria: ordem',
    'orcamento_salvar' => 'Orçamento salvo', 'orcamento_status' => 'Orçamento: status',
    'categoria_visivel' => 'Categoria: mostrar no site', 'categoria_itens' => 'Categoria: itens incluídos/tirados',
];

/* Foto do estado ANTES da mudança (para registrar "de X para Y"). Devolve [tabela, id, campos] ou null. */
function lerAlvo(string $a, array $in, ?int $idForcado = null): ?array {
    $id = $idForcado ?? (int)($in['id'] ?? 0);
    $mapa = [
        'produtos' => ['produtos', 'codigo, nome, preco, estoque, ativo, controla, usa_cores'],
        'pedidos' => ['pedidos', 'cliente, status, pago, total'],
        'clientes' => ['clientes', 'nome, telefone, cidade'],
        'categorias' => ['categorias', 'nome, parent_id, ativo'],
        'cores' => ['cores', 'nome, hex'],
        'orcamentos' => ['orcamentos', 'cliente, status, total, validade'],
    ];
    $grupo = [
        'produto_salvar' => 'produtos', 'produto_ajustar' => 'produtos', 'produto_excluir' => 'produtos', 'pedido_status' => 'pedidos', 'pedido_salvar' => 'pedidos',
        'cliente_salvar' => 'clientes', 'cliente_excluir' => 'clientes', 'categoria_salvar' => 'categorias', 'categoria_excluir' => 'categorias',
        'categoria_visivel' => 'categorias', 'categoria_ordenar' => 'categorias', 'categoria_itens' => 'categorias', 'cor_salvar' => 'cores', 'cor_excluir' => 'cores',
        'orcamento_salvar' => 'orcamentos', 'orcamento_status' => 'orcamentos',
    ][$a] ?? null;
    if ($grupo === null || $id < 1) return null;
    try {
        [$t, $campos] = $mapa[$grupo];
        $s = db()->prepare("SELECT $campos FROM $t WHERE id = ?"); $s->execute([$id]);
        $r = $s->fetch(PDO::FETCH_ASSOC);
        return $r ? ['tabela' => $t, 'id' => $id, 'campos' => $r] : null;
    } catch (Throwable $e) { return null; }
}

function nomeDoAlvo(string $tabela, int $id, array $campos): string {
    $nome = $campos['nome'] ?? $campos['cliente'] ?? '';
    $cod = $campos['codigo'] ?? '';
    return trim(rtrim($tabela, 's') . " #$id " . ($cod !== '' ? "$cod " : '') . $nome);
}

/* Compara antes e depois e devolve "preco: 14.9 -> 15.9; estoque: 3 -> 2". */
function diferencas(?array $antes, ?array $depois): string {
    $t = [];
    foreach (($depois ?? []) as $k => $v) {
        $v0 = $antes[$k] ?? null;
        if ($antes !== null && (string)$v0 === (string)$v) continue;
        if ($antes === null) { if ((string)$v === '' || in_array($k, ['usa_cores', 'controla', 'ativo', 'pago'], true)) continue; $t[] = "$k: $v"; continue; }
        $t[] = "$k: " . ($v0 === null ? '(vazio)' : $v0) . ' -> ' . $v;
    }
    return implode('; ', $t);
}

/* Roda no fim de cada pedido POST do painel. Só grava se deu certo (código abaixo de 400). */
function auditarRequisicao(string $a, array $in, ?array $antes): void {
    if (http_response_code() >= 400 || !isset(ROTULOS_ACAO[$a])) return;
    $saida = $GLOBALS['__saida'] ?? [];
    $id = (int)($in['id'] ?? 0);
    foreach ([['produto', 'id'], ['pedido', 'id'], ['cliente', 'id']] as [$k, $c]) if (!$id && isset($saida[$k][$c])) $id = (int)$saida[$k][$c];
    if (!$id && isset($saida['id'])) $id = (int)$saida['id'];
    $depois = $id ? lerAlvo($a, $in, $id) : null;
    $alvo = ''; $det = '';
    if ($depois) {
        $alvo = nomeDoAlvo($depois['tabela'], $depois['id'], $depois['campos']);
        $det = diferencas($antes['campos'] ?? null, $depois['campos']);
    } elseif ($antes) {   /* exclusões: o item já não existe, usa a foto de antes */
        $alvo = nomeDoAlvo($antes['tabela'], $antes['id'], $antes['campos']);
    }
    if ($a === 'produto_ajustar') $det = 'ajuste de ' . ((int)($in['delta'] ?? 0) > 0 ? '+' : '') . (int)($in['delta'] ?? 0) . ($det ? "; $det" : '');
    if ($a === 'categoria_itens') $det = 'incluídos: ' . count((array)($in['add'] ?? [])) . '; tirados: ' . count((array)($in['remove'] ?? []));
    if ($a === 'produto_importar') $det = 'novos: ' . (int)($saida['novos'] ?? 0) . '; já existiam: ' . (int)($saida['pulados'] ?? 0);
    if ($a === 'custos_importar') $det = 'atualizados: ' . (int)($saida['atualizados'] ?? 0);   /* valores de custo NÃO entram no histórico */
    if ($a === 'parametros_salvar') $det = 'parâmetros de custo alterados';
    auditar(ROTULOS_ACAO[$a], $alvo, $det);
}

/* ---------- avisos por e-mail ---------- */
/* E-mail que recebe os avisos (digitado em Ajustes). Vazio = ainda não configurado. */
function emailAvisos(): string {
    try {
        $s = db()->prepare('SELECT valor FROM parametros WHERE chave = ?'); $s->execute(['email_avisos']);
        $v = $s->fetchColumn();
        if (is_string($v) && filter_var($v, FILTER_VALIDATE_EMAIL)) return $v;
    } catch (Throwable $e) {}
    return '';
}

/* Manda um e-mail simples (texto). Devolve true se a hospedagem aceitou enviar. Nunca derruba o painel. */
function enviarEmail(string $para, string $assunto, string $texto): bool {
    try {
        $host = preg_replace('/^www\./', '', (string)($_SERVER['HTTP_HOST'] ?? 'lxlprojetos.site'));
        $de = 'painel@' . (strpos($host, '.') !== false ? $host : 'lxlprojetos.site');
        $cab = "From: Painel LXL <$de>\r\nContent-Type: text/plain; charset=UTF-8\r\nX-Mailer: painel-lxl";
        return function_exists('mail') && @mail($para, '=?UTF-8?B?' . base64_encode('[Painel LXL] ' . $assunto) . '?=', $texto, $cab);
    } catch (Throwable $e) { return false; }
}

/* Aviso de segurança para o e-mail configurado em Ajustes, com o resultado registrado no histórico. */
function enviarAviso(string $assunto, string $texto): bool {
    $para = emailAvisos();
    if ($para === '') { auditar('Aviso de segurança', $assunto, 'e-mail NÃO enviado: nenhum e-mail configurado em Ajustes', 'sistema'); return false; }
    $ok = enviarEmail($para, $assunto, $texto . "\n\nIP: " . ipCliente() . "\nHorário: " . date('d/m/Y H:i:s'));
    auditar('Aviso de segurança', $assunto, ($ok ? 'e-mail enviado' : 'NÃO foi possível enviar o e-mail (veja se a hospedagem permite envio)'), 'sistema');
    return $ok;
}

/* ---------- links de convite e de senha ---------- */
/* Endereço do painel (funciona na pasta de teste e na de produção sem mexer em nada). */
function enderecoDoPainel(): string {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    return ($https ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'lxlprojetos.site') . rtrim(dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/painel/api.php')), '/') . '/';
}
/* Cria um link de uso único. No banco só fica o "hash" do código, nunca o código em si. Devolve o código para montar o link. */
function criarToken(string $tipo, int $segundos, ?int $usuarioId = null, string $email = '', string $perfil = ''): string {
    $t = bin2hex(random_bytes(24));
    if ($tipo === 'reset' && $usuarioId) db()->prepare("UPDATE tokens SET usado = 1 WHERE tipo = 'reset' AND usuario_id = ?")->execute([$usuarioId]);   /* link novo invalida o anterior */
    db()->prepare('INSERT INTO tokens (tipo, hash, usuario_id, email, perfil, expira, criado_em) VALUES (?,?,?,?,?,?,?)')
        ->execute([$tipo, hash('sha256', $t), $usuarioId, $email, $perfil, time() + $segundos, date('Y-m-d H:i:s')]);
    return $t;
}
function acharToken(string $t): ?array {
    if (!preg_match('/^[a-f0-9]{48}$/', $t)) return null;
    $s = db()->prepare('SELECT * FROM tokens WHERE hash = ? AND usado = 0 AND expira > ?'); $s->execute([hash('sha256', $t), time()]);
    return $s->fetch() ?: null;
}

/* Lembra do aparelho (IP + navegador). Devolve true se for a primeira vez que ele entra (e já havia outros). */
function registrarDispositivo(string $usuario): bool {
    try {
        $db = db();
        $agente = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 160);
        $h = hash('sha256', $usuario . '|' . ipCliente() . '|' . $agente);
        $agora = date('Y-m-d H:i:s');
        $s = $db->prepare('SELECT id FROM dispositivos WHERE hash = ?'); $s->execute([$h]);
        if ($s->fetch()) { $db->prepare('UPDATE dispositivos SET ultimo = ? WHERE hash = ?')->execute([$agora, $h]); return false; }
        $q = $db->prepare('SELECT COUNT(*) FROM dispositivos WHERE usuario = ?'); $q->execute([$usuario]);
        $jaTinha = (int)$q->fetchColumn() > 0;
        $db->prepare('INSERT INTO dispositivos (hash, usuario, primeiro, ultimo, ip, agente) VALUES (?,?,?,?,?,?)')->execute([$h, $usuario, $agora, $agora, ipCliente(), $agente]);
        return $jaTinha;
    } catch (Throwable $e) { return false; }
}

/* Conta quantas falhas esse IP teve nos últimos 15 minutos. */
function falhasRecentes(): int {
    $s = db()->prepare('SELECT COUNT(*) FROM tentativas WHERE ip = ? AND quando > ?');
    $s->execute([ipCliente(), time() - 900]);
    return (int)$s->fetchColumn();
}
