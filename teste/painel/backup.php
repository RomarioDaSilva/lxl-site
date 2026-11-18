<?php
declare(strict_types=1);
/*
 * BACKUP do painel: monta um arquivo com TUDO o que está no banco (pedidos, clientes, estoque, categorias, custos, histórico).
 * Fica de fora de propósito: usuários/senhas, links de convite e de senha, tentativas de login e aparelhos (para a senha nunca viajar num arquivo).
 * O arquivo baixado tem dados privados e custos: guarde num lugar seguro e nunca coloque no GitHub.
 * Para voltar os dados depois, peça ajuda (o arquivo é um JSON com uma lista de linhas para cada tabela).
 */
const TABELAS_BACKUP = ['produtos', 'cores', 'produto_cores', 'categorias', 'produto_categorias', 'clientes', 'pedidos', 'itens', 'orcamentos', 'orcamento_itens', 'parametros', 'metricas', 'auditoria'];

function montarBackup(): array {
    $db = db(); $t = [];
    foreach (TABELAS_BACKUP as $nome) {
        try { $t[$nome] = $db->query("SELECT * FROM $nome")->fetchAll(PDO::FETCH_ASSOC); }
        catch (Throwable $e) { $t[$nome] = []; }
    }
    return ['sistema' => 'painel-lxl', 'versao' => 1, 'gerado_em' => date('Y-m-d H:i:s'), 'contagem' => array_map('count', $t), 'tabelas' => $t];
}
