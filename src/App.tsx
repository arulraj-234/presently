import { ChakraProvider, Box, Container } from '@chakra-ui/react'
import { AttendanceDashboard } from './components/AttendanceDashboard'
import { Header } from './components/Header'
import { theme } from './theme'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh">
        <Container maxW="container.lg" py={2}>
          <Header />
          <ErrorBoundary>
            <AttendanceDashboard />
          </ErrorBoundary>
        </Container>
      </Box>
    </ChakraProvider>
  )
}

export default App
