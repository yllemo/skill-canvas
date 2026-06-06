<?php
declare(strict_types=1);

/**
 * App-inställningar (UI, canvas m.m.).
 *
 * Lägg till nya poster under 'groups' → 'settings' med unikt 'key'.
 * Stödda typer: choice, color. Fler typer kan läggas till i includes/settings.php.
 */
return [
    'storageKey' => 'sc-settings',

    'defaults' => [
        'canvasBackground' => 'dots',
        'canvasBgColor' => '',
        'canvasGridColor' => '',
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
    ],
];
