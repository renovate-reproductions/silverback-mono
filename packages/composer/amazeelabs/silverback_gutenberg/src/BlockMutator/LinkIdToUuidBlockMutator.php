<?php

namespace Drupal\silverback_gutenberg\BlockMutator;

use Drupal\Component\Utility\Html;
use Drupal\Core\Entity\EntityRepositoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\silverback_gutenberg\BlockMutatorInterface;
use Drupal\silverback_gutenberg\Utils;

/**
 * Replace entity UIs with UUIDs in links.
 */
class LinkIdToUuidBlockMutator implements BlockMutatorInterface {

  protected EntityRepositoryInterface $repository;

  protected EntityTypeManagerInterface $entityTypeManager;

  protected array $prefixToEntityTypeMap = [];

  protected string $prefixRegex;

  protected array $cache = [];

  public function __construct(
    EntityRepositoryInterface $repository,
    EntityTypeManagerInterface $entityTypeManager
  ) {
    $this->repository = $repository;
    $this->entityTypeManager = $entityTypeManager;

    foreach ($entityTypeManager->getDefinitions() as $entityType) {
      $linkTemplate = $entityType->getLinkTemplate('canonical');
      if (
        $linkTemplate &&
        // Only simple URL templates. E.g. "/node/{node}".
        preg_match('~^/([a-z_-]+)/\{[^}]+}$~', $linkTemplate, $matches)
      ) {
        $this->prefixToEntityTypeMap[$matches[1]] = $entityType->id();
      }
    }
    $this->prefixRegex = '(' . implode(')|(', array_keys($this->prefixToEntityTypeMap)) . ')';
  }

  public function applies(array $block) : bool {
    return trim($block['innerHTML']) !== '' || !empty($block['attrs']);
  }

  public function mutate(array &$block) : void {
    if (trim($block['innerHTML']) !== '') {
      $this->mutateString($block['innerHTML']);
    }
    if (!empty($block['attrs'])) {
      $this->mutateAttributes($block['attrs']);
    }
  }

  protected function mutateAttributes(array &$attributes): void {
    foreach ($attributes as &$attribute) {
      if (is_string($attribute)) {
        $this->mutateString($attribute);
      }
      else if (is_array($attribute)) {
        $this->mutateAttributes($attribute);
      }
    }
  }

  protected function mutateString(string &$string): void {

    // Single URL string, e.g. "/node/123".
    if (preg_match('~^/(' . $this->prefixRegex . ')/(\d+)$~', $string, $matches)) {
      $prefix = $matches[1];
      $id = end($matches);
      $result = "/{$prefix}/" . $this->getUuid($prefix, $id);
      $string = $result;
    }

    // For HTML do a simple check first.
    if (preg_match('~(\shref=")/(' . $this->prefixRegex . ')/\d+"~', $string, $matches)) {
      $document = Html::load($string);
      foreach ($document->getElementsByTagName('a') as $link) {
        //AXXX replace both href and data-id attrs
      }
      $result = Utils::serializeHtml($document);
      $string = $result;
    }

//    $result = preg_replace_callback(
//      '~(\shref=")/(' . $this->prefixRegex . ')/(\d+)"~',
//      function ($matches) {
//        $prefix = $matches[2];
//        $id = end($matches);
//        $result = "{$matches[1]}/{$prefix}/" . $this->getUuid($prefix, $id) . '"';
//        return $result;
//      },
//      $string,
//      -1,
//      $count
//    );
//    if ($count) {
//      $string = $result;
//    }
  }

  protected function getUuid(string $prefix, string $id): string {
    $entityType = $this->prefixToEntityTypeMap[$prefix];
    if (!isset($this->cache[$entityType][$id])) {
      $entity = $this->entityTypeManager->getStorage($entityType)->load($id);
      if ($entity) {
        $this->cache[$entityType][$id] = $entity->uuid();
      }
      else {
        \Drupal::logger('silverback_gutenberg')->warning(
          "LinkIdToUuidBlockMutator: Could not load entity '{$entityType}' by ID '{$id}'."
        );
        $this->cache[$entityType][$id] = $id;
      }
    }
    return $this->cache[$entityType][$id];
  }

}
