<?php
declare(strict_types=1);

/**
 * Fler val i lägg-till-panelen (⋯-menyn).
 * Lägg till poster under 'items' — aktivera med enabled => true när modulen finns.
 */
return [
    'buttonLabel' => 'Fler val',
    'comingSoonToast' => 'Kommer snart',

    'items' => [
        [
            'id' => 'html',
            'label' => 'HTML / iframe',
            'enabled' => true,
            'description' => 'Bädda in extern webbsida via iframe',
        ],
        [
            'id' => 'prompt-book',
            'label' => 'Prompt book',
            'enabled' => false,
            'description' => 'Samling av prompts och mallar',
        ],
        [
            'id' => 'bpmn',
            'label' => 'BPMN',
            'enabled' => false,
            'description' => 'BPMN-processdiagram',
        ],
        [
            'id' => 'archimate',
            'label' => 'ArchiMate',
            'enabled' => false,
            'description' => 'ArchiMate enterprise-arkitektur',
        ],
    ],
];
