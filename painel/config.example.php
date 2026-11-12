<?php
/*
 * MODELO de configuração do painel da LXL.
 *
 * Este arquivo NÃO tem senha de verdade e pode ficar no GitHub.
 * O arquivo verdadeiro se chama  lxl-config.php  e fica na Hostinger,
 * FORA da pasta public_html (um nível acima), para ninguém conseguir abrir
 * pelo navegador e para o GitHub nunca ver a senha.
 */
return [
    'driver' => 'mysql',
    'host'   => 'localhost',
    'db'     => 'u397975881_lxl',
    'user'   => 'u397975881_lxl',
    'pass'   => 'COLE_AQUI_A_SENHA_DO_BANCO',

    // Código secreto que só você sabe. Serve UMA vez, na primeira
    // vez que abrir o painel, para criar o seu usuário e a sua senha.
    'codigo_inicial' => 'ESCOLHA_UM_CODIGO_SECRETO',
];
