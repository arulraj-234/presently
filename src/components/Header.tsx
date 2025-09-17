import { HStack, Heading, IconButton, Spacer, useColorMode, Tooltip, Text, Box, useColorModeValue, Image as ChakraImage } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import logo from '../assets/logo.svg';

export const Header = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [now, setNow] = useState<Date>(new Date());
  const subColor = useColorModeValue('gray.600', 'gray.300');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <HStack as="header" py={4} px={2}>
      <HStack>
        <ChakraImage src={logo} alt="Presently Logo" boxSize="28px" />
        <Heading size="md">Presently</Heading>
      </HStack>
      <Box ml={3}>
        <Text fontSize="sm" color={subColor}>
          <span role="img" aria-label="calendar" style={{ marginRight: 6 }}>📅</span>
          {now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
          {' '}
          •
          {' '}
          <span role="img" aria-label="clock" style={{ marginRight: 6, marginLeft: 2 }}>🕒</span>
          {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
        </Text>
      </Box>
      <Spacer />
      <Tooltip label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
        <IconButton
          aria-label="Toggle color mode"
          size="sm"
          onClick={toggleColorMode}
          icon={
            <span role="img" aria-label={colorMode === 'light' ? 'Moon' : 'Sun'} style={{ fontSize: '1.1rem' }}>
              {colorMode === 'light' ? '🌙' : '☀️'}
            </span>
          }
          variant="ghost"
        />
      </Tooltip>
    </HStack>
  );
}
