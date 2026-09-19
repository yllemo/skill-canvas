<?php
declare(strict_types=1);

/**
 * App-inställningar (UI, canvas, Git m.m.).
 *
 * Lägg till nya poster under 'groups' → 'settings' med unikt 'key'.
 * Stödda typer: choice, color, text, password. Fler typer i includes/settings.php.
 */
return [
    'storageKey' => 'sc-settings',

    'defaults' => [
        'canvasBackground' => 'dots',
        'canvasBgColor' => '',
        'canvasGridColor' => '',
        'gitProvider' => 'github',
        'gitHost' => '',
        'gitOwner' => '',
        'gitRepo' => '',
        'gitBranch' => 'main',
        'gitPath' => '',
        'gitToken' => '',
    ],

    'themeColors' => [
        'light' => [
            'canvasBg' => '#E8EEF4',
            'grid' => 'rgba(0,119,188,0.08)',
        ],
        'dark' => [
            'canvasBg' => '#111519',
            'grid' => 'rgba(71,158,245,0.06)',
        ],
    ],

    'groups' => [
        [
            'id' => 'canvas',
            'label' => 'Canvas',
            'settings' => [
                [
                    'key' => 'canvasBackground',
                    'type' => 'choice',
                    'label' => 'Bakgrund',
                    'description' => 'Prickar, rutnät eller enfärgad yta.',
                    'options' => [
                        ['value' => 'dots', 'label' => 'Prickar'],
                        ['value' => 'lines', 'label' => 'Rutnät'],
                        ['value' => 'solid', 'label' => 'Enfärgad'],
                    ],
                ],
                [
                    'key' => 'canvasBgColor',
                    'type' => 'color',
                    'label' => 'Bakgrundsfärg',
                    'description' => 'Ytfärgen bakom mönster. Tom = följer ljust/mörkt tema.',
                ],
                [
                    'key' => 'canvasGridColor',
                    'type' => 'color',
                    'label' => 'Färg prickar / linjer',
                    'description' => 'Gäller prickar och rutnät. Tom = följer ljust/mörkt tema.',
                    'whenBackground' => ['dots', 'lines'],
                ],
            ],
        ],
        [
            'id' => 'git',
            'label' => 'Git (GitHub / GitLab)',
            'settings' => [
                [
                    'key' => 'gitProvider',
                    'type' => 'choice',
                    'label' => 'Leverantör',
                    'description' => 'Sparas lokalt i webbläsaren (localStorage) — skickas aldrig till Skill Canvas-servern. Välj GitHub eller GitLab.',
                    'options' => [
                        ['value' => 'github', 'label' => 'GitHub'],
                        ['value' => 'gitlab', 'label' => 'GitLab'],
                    ],
                    'compact' => true,
                ],
                [
                    'key' => 'gitHost',
                    'type' => 'text',
                    'label' => 'Host (valfri)',
                    'description' => 'Tom = github.com / gitlab.com. För self-hosted: t.ex. gitlab.example.com',
                    'placeholder' => 'gitlab.example.com',
                    'autocomplete' => 'off',
                ],
                [
                    'key' => 'gitOwner',
                    'type' => 'text',
                    'label' => 'Ägare / grupp',
                    'description' => 'GitHub: användare eller organisation. GitLab: grupp eller användare (första delen av sökvägen).',
                    'placeholder' => 'min-org',
                    'autocomplete' => 'off',
                ],
                [
                    'key' => 'gitRepo',
                    'type' => 'text',
                    'label' => 'Repository',
                    'description' => 'Repots namn. GitLab med undergrupper: group/subgroup/repo i Ägare + Repo, eller hela sökvägen i Repo.',
                    'placeholder' => 'mina-skills',
                    'autocomplete' => 'off',
                ],
                [
                    'key' => 'gitBranch',
                    'type' => 'text',
                    'label' => 'Branch',
                    'placeholder' => 'main',
                    'autocomplete' => 'off',
                ],
                [
                    'key' => 'gitPath',
                    'type' => 'text',
                    'label' => 'Mapp i repot (valfri)',
                    'description' => 'Begränsa listning till en undermapp, t.ex. skills/',
                    'placeholder' => 'skills/',
                    'autocomplete' => 'off',
                ],
                [
                    'key' => 'gitToken',
                    'type' => 'password',
                    'label' => 'Access token (PAT)',
                    'description' => 'Sparas endast i denna webbläsare (nyckel sc-git). GitHub: Contents Read & Write. GitLab: api eller read/write_repository.',
                    'placeholder' => 'ghp_… / glpat-…',
                    'autocomplete' => 'off',
                ],
            ],
        ],
    ],
];
