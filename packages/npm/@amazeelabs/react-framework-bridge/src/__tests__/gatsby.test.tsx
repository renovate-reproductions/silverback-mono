import { Field, FormikValues } from 'formik';
import { GatsbyLinkProps } from 'gatsby';
import { GatsbyImageProps } from 'gatsby-plugin-image';
import React, { useEffect, useState } from 'react';

import { buildForm, buildImage, buildLink } from '../gatsby';
import { render, screen, type, userEvent, waitFor } from '../test-utils';

const gatsbyNav = vi.fn();

type gatsby = {
  Link: (props: GatsbyLinkProps<any>) => JSX.Element;
  navigate: (to: string) => Promise<void>;
};

vi.mock(
  'gatsby',
  (): gatsby => ({
    // eslint-disable-next-line react/display-name
    Link: ({ children, to, ...props }) => (
      <a href={to} data-gatsby={true} {...props}>
        {children}
      </a>
    ),
    navigate: (to: string) => gatsbyNav(to),
  }),
);

type gatsbyPluginImage = {
  GatsbyImage: (props: GatsbyImageProps) => JSX.Element;
};

vi.mock(
  'gatsby-plugin-image',
  (): gatsbyPluginImage => ({
    // eslint-disable-next-line react/display-name
    GatsbyImage: (props) => {
      const { image, ...rest } = props;
      // @ts-ignore
      return <div data-gatsby-image={JSON.stringify(image)} {...rest} />;
    },
  }),
);
beforeEach(() => {
  vi.resetAllMocks();
});

describe('buildImage', () => {
  it('builds a GatsbyImage if there is Gatsby image data', () => {
    const Image = buildImage({
      alt: 'Foo!',
      image: {
        width: 10,
        height: 10,
        layout: 'constrained',
        images: {
          sources: [{ srcSet: 'foo.png', media: 'image' }],
        },
      },
    });
    render(
      <div data-testid={'image'}>
        <Image className={'bar'} />
      </div>,
    );
    expect(screen.getByTestId('image').children[0]).toMatchInlineSnapshot(`
      <div
        alt="Foo!"
        class="bar"
        data-gatsby-image="{\\"width\\":10,\\"height\\":10,\\"layout\\":\\"constrained\\",\\"images\\":{\\"sources\\":[{\\"srcSet\\":\\"foo.png\\",\\"media\\":\\"image\\"}]}}"
      />
    `);
  });

  it('builds a regular responsive image if there is a src with width and height', () => {
    const Image = buildImage({
      alt: 'Foo!',
      src: 'foo.png',
      width: 400,
      height: 300,
    });
    render(
      <div data-testid={'image'}>
        <Image className={'bar'} />
      </div>,
    );
    expect(screen.getByTestId('image').children[0]).toMatchInlineSnapshot(`
      <div
        style="width: 100%; position: relative; padding-bottom: 75%;"
      >
        <img
          alt="Foo!"
          class="bar"
          src="foo.png"
          style="display: block; width: 100%; position: absolute; top: 0px; left: 0px;"
        />
      </div>
    `);
  });
});

describe('buildLink', () => {
  it('can build a link from segments and query parameters', () => {
    const Link = buildLink({
      segments: ['/foo', 'bar'],
      query: {
        a: 'b',
      },
    });
    expect(Link.href).toEqual('/foo/bar?a=b');
    render(<Link>Test</Link>);
    expect(screen.getByRole('link').getAttribute('data-gatsby')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toEqual(
      '/foo/bar?a=b',
    );
  });

  it('can build a link from only query parameters', () => {
    const Link = buildLink({
      query: {
        a: 'b',
      },
    });
    expect(Link.href).toEqual('?a=b');
    render(<Link>Test</Link>);
    expect(screen.getByRole('link').getAttribute('data-gatsby')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toEqual('?a=b');
  });

  it('allows the consumer to set query parameters', () => {
    const Link = buildLink({
      href: '/foo',
    });
    expect(Link.href).toEqual('/foo');
    render(<Link query={{ a: 'b' }}>Test</Link>);
    expect(screen.getByRole('link').getAttribute('href')).toEqual('/foo?a=b');
  });

  it('allows the consumer to set a query fragment', () => {
    const Link = buildLink({
      href: '/foo',
    });
    expect(Link.href).toEqual('/foo');
    render(<Link fragment="bar">Test</Link>);
    expect(screen.getByRole('link').getAttribute('href')).toEqual('/foo#bar');
  });

  it('allows the consumer to set query parameters and fragments', () => {
    const Link = buildLink({
      href: '/foo',
    });
    expect(Link.href).toEqual('/foo');
    render(
      <Link query={{ a: 'b' }} fragment="bar">
        Test
      </Link>,
    );
    expect(screen.getByRole('link').getAttribute('href')).toEqual(
      '/foo?a=b#bar',
    );
  });

  it('renders a Gatsby link for an internal path', () => {
    const Link = buildLink({ href: '/test' });
    expect(Link.href).toEqual('/test');
    render(<Link>Test</Link>);
    expect(screen.getByRole('link').getAttribute('data-gatsby')).toBeTruthy();
  });

  it('renders normal link for an external path', () => {
    const Link = buildLink({ href: 'http://www.amazeelabs.com' });
    expect(Link.href).toEqual('http://www.amazeelabs.com');
    render(<Link>Test</Link>);
    expect(screen.getByRole('link').getAttribute('data-gatsby')).toBeFalsy();
  });

  it('renders normal link for an external target', () => {
    const Link = buildLink({
      href: 'http://www.amazeelabs.com',
      target: '_blank',
    });
    expect(Link.href).toEqual('http://www.amazeelabs.com');
    render(<Link>Test</Link>);
    expect(screen.getByRole('link').getAttribute('data-gatsby')).toBeFalsy();
  });

  it('renders normal link for an mailto address', () => {
    const Link = buildLink({
      href: 'mailto:development@amazeelabs.com',
    });
    expect(Link.href).toEqual('mailto:development@amazeelabs.com');
    render(<Link>Test</Link>);
    expect(screen.getByRole('link').getAttribute('data-gatsby')).toBeFalsy();
  });

  it('exposes Gatsby navigate', () => {
    const Link = buildLink({ href: '#test' });
    expect(Link.href).toEqual('#test');
    Link.navigate();
    expect(gatsbyNav).toHaveBeenCalledTimes(1);
    expect(gatsbyNav).toHaveBeenCalledWith('#test');
  });

  it('exposes Gatsby navigate that allows to override query and fragments', () => {
    const Link = buildLink({ href: '/foo', query: { a: 'b' } });
    expect(Link.href).toEqual('/foo?a=b');
    Link.navigate({ query: { a: 'c' }, fragment: 'bar' });
    expect(gatsbyNav).toHaveBeenCalledTimes(1);
    expect(gatsbyNav).toHaveBeenCalledWith('/foo?a=c#bar');
  });
});

describe('buildForm', () => {
  it('hands form values to the submit callback', async () => {
    const callback = vi.fn();
    const Form = buildForm({
      initialValues: { foo: '' },
      onSubmit: (values) => callback(values),
    });
    render(
      <Form>
        <Field type="text" name="foo" />
        <button type="submit" />
      </Form>,
    );
    await userEvent.type(screen.getByRole('textbox'), 'bar');
    await userEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
    });
  });

  it('emits value changes via the "onChange" callback', async () => {
    const onChange = vi.fn();
    const Form = buildForm({ initialValues: { foo: '' }, onChange });
    render(
      <Form>
        <Field type="text" name="foo" />
        <button type="submit" />
      </Form>,
    );
    await type(screen.getByRole('textbox'), 'bar');
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(4);
      expect(onChange).toHaveBeenNthCalledWith(1, { foo: '' });
      expect(onChange).toHaveBeenNthCalledWith(2, { foo: 'b' });
      expect(onChange).toHaveBeenNthCalledWith(3, { foo: 'ba' });
      expect(onChange).toHaveBeenNthCalledWith(4, { foo: 'bar' });
    });
  });

  it('pre-populates the from useInitialValues hook if available', async () => {
    const useInitialValues = () => {
      const [values, setValues] = useState<FormikValues | undefined>(undefined);
      useEffect(() => {
        setTimeout(() => {
          setValues({ foo: 'foo' });
        }, 100);
      }, [setValues]);
      return values;
    };

    const Form = buildForm({ initialValues: { foo: '' }, useInitialValues });
    render(
      <Form>
        <Field type="text" name="foo" />
        <button type="submit" />
      </Form>,
    );
    const input = screen.getByRole('textbox');
    await waitFor(() => expect(input.getAttribute('value')).toEqual('foo'));
  });
});
