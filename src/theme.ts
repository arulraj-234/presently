import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

export const theme = extendTheme({
  config,
  fonts: {
    heading: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    body: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  },
  colors: {
    brand: {
      50: '#e6fffb',
      100: '#b5f5ec',
      200: '#87e8de',
      300: '#5cdbd3',
      400: '#36cfc9',
      500: '#13c2c2',
      600: '#08979c',
      700: '#006d75',
      800: '#00474f',
      900: '#002e33',
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      baseStyle: {
        borderRadius: 'md',
        fontWeight: '600',
      },
    },
    Input: {
      defaultProps: { focusBorderColor: 'brand.400' },
    },
    NumberInput: {
      defaultProps: { focusBorderColor: 'brand.400' },
    },
    Table: {
      baseStyle: {
        th: { fontWeight: '600' },
      },
      variants: {
        striped: {
          thead: { bg: 'gray.50', _dark: { bg: 'gray.700' } },
          tbody: {
            tr: {
              _hover: { bg: 'gray.50', _dark: { bg: 'gray.700' } },
            },
          },
        },
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        _dark: { bg: 'gray.900' },
      },
    },
  },
});
