<?php

namespace Drupal\silverback_gutenberg\BlockMutator;

use Drupal\Core\Entity\EntityRepositoryInterface;
use Drupal\silverback_gutenberg\BlockMutatorInterface;

/**
 * Replace entity UUIDs with IDs in links.
 */
class LinkUuidToIdBlockMutator implements BlockMutatorInterface {

  protected EntityRepositoryInterface $repository;

  public function __construct(EntityRepositoryInterface $repository) {
    $this->repository = $repository;
  }

  public function applies(array $block) : bool {
    return trim($block['innerHTML']) !== '' || !empty($block['attrs']);
  }

  public function mutate(array &$block) : void {
    echo ''; // AXXX
  }

}
