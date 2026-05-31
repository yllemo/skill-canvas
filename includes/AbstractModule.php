<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/helpers.php';

abstract class AbstractModule
{
    abstract public function getSlug(): string;

    abstract public function getType(): string;

    protected function nodeDefaults(): array
    {
        return module_defaults($this->getType());
    }

    protected function config(): array
    {
        return module_config($this->getSlug());
    }

    public function getMeta(): array
    {
        return array_merge($this->config(), [
            'slug' => $this->getSlug(),
            'type' => $this->getType(),
            'defaults' => $this->nodeDefaults(),
        ]);
    }

    public function render(string $mode, array $values = []): string
    {
        return match ($mode) {
            'add' => $this->renderAdd(),
            'edit' => $this->renderEdit($values),
            default => '',
        };
    }

    abstract protected function renderAdd(): string;

    abstract protected function renderEdit(array $values): string;
}
