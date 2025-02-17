# Gatsby Source Silverback

Gatsby source plugin to connect to Drupal exposing a custom [GraphQL V4] schema
that employs the extension plugin provided by the [Silverback Gatsby] module.

[graphql v4]: https://drupal-graphql.gitbook.io/graphql/v/8.x-4.x/
[silverback gatsby]: https://packagist.org/packages/amazeelabs/silverback_gatsby

## Features

- Incremental updates
- Automatic creation of Gatsby pages
- Type-safe inference of Drupal's schema definition
- Exposes a "build id" for preview and production builds

## Installation & Configuration

Simply install the package and add it to your Gatsby configuration.

```shell
yarn add @amazeelabs/gatsby-source-silverback
```

```typescript
export const plugins = {
  resolve: '@amazeelabs/gatsby-source-silverback',
  options: {
    drupal_url: 'https://my.drupal.website',
    graphql_path: '/path to my schema',
    auth_user: 'admin',
    auth_pass: 'admin',
  },
};
```

The following configuration options are supported:

- `drupal_url` **(required)**: The base url of the Drupal installation to
  connect to.
- `graphql_path` **(required)**: The configured path of the configured Drupal
  GraphQL server instance.
- `auth_user` and `auth_pass` **(optional)**: A username and a password for
  either
  - passing by the basic auth protection (e.g. if Drupal is protected with
    Lagoon's basic auth)
  - authorizing GraphQL requests (e.g. if Drupal's `basic_auth` module is
    enabled)
- `auth_key` **(optional)**: A key to be passed in `api-key` header to authorize
  GraphQL requests (e.g. if [key_auth](https://www.drupal.org/project/key_auth)
  module is enabled)
- `query_concurrency` **(optional)**: How many GraphQL queries can be executed
  in parallel. Defaults to 10.
- `paginator_page_size` **(optional)**: How many entities to fetch in a single
  GraphQL query. Defaults to 100.

The optional credential parameters can be used to enable different workflows. On
production, they can be omitted to make sure Drupal handles these requests
anonymously and won't expose any unpublished content. Alternatively one can also
configure a dedicated role and user for this task and block anonymous users
entirely from accessing Drupal. In a preview environment on the other hand, the
credentials should allow Gatsby to access unpublished content to be able to
display previews.

## Automatic creation of Gatsby pages

The [silverback gatsby] module provides `@isPath` and `@isTemplate` field
directives which allow automatic creation of Gatsby pages. Both directives are
optional.

- If a field is marked with `@isPath` directive, the plugin will attempt to
  create a Gatsby page for a Gatsby node fetched from Drupal.
- The `@isTemplate` directive can be used to define which template to use for
  the page creation.

### Example GraphQL schema on Drupal side with some details

```graphql
type SpecialPage @entity(type: "node", bundle: "special_page") {
  # There is no `@isPath` directive, so the plugin will not try to create pages
  # for this type.
  path: String!
}

type RegularPage @entity(type: "node", bundle: "page") {
  # Because the `path` field is optional, the page will only be created if
  # the `path` value is truthy.
  path: String @isPath
  # There is no `@isTemplate` directive, so the plugin will use the CamelCase
  # type name to build the snake-case template name. For this type it will be
  # `regular-page.tsx`.
}

type Post @entity(type: "node", bundle: "blog") {
  path: String! @isPath
  # If the field value is falsy, the regular template will be used: `post.tsx`
  # Otherwise the field value will be used: `${node.template}.tsx`
  template: String @isTemplate
}
```

If the template file does not exist, the stub template will be used, and a
warning message will be logged.

## Build-ID's

The [silverback gatsby] module keeps track of content updates sent to Gatsby
with incremental build ID's. The Drupal GraphQL API exposes the latest build ID
through a GraphQL field.

```graphql
query {
  drupalBuildId
}
```

The `gatsby-source-silverback` plugin will also expose the ID of the latest
build. In a development or preview environment it works identical to Drupal, by
querying a root level `drupalBuildID` field. A production build will contain a
`build.json` file at the root that contains the same information.

```json
{
  "drupalBuildId": 8
}
```

This can be used to determine if a given website reflects the latest content
stored in Drupal or an update is bound to happen.
