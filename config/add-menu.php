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
            'id' => 'bpmn',
            'label' => 'BPMN',
            'enabled' => true,
            'description' => 'BPMN-processdiagram',
        ],
        [
            'id' => 'promptbook',
            'label' => 'PromptBook',
            'enabled' => true,
            'description' => 'Chattkort med en prompt — OpenAI, LM Studio eller Ollama',
        ],
        [
            'id' => 'archicode',
            'label' => 'ArchiCode',
            'enabled' => true,
            'description' => 'ArchiMate 4-diagram med ArchiCode-syntax',
        ],
    ],
];
