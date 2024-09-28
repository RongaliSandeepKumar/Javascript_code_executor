import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Trash2, Copy } from "lucide-react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Toast } from "@/components/ui/toast"
// import miracleLogo from "../assets/miracle-logo-dark.png"
import mylogo from "../assets/5231.jpg"
// import gcplogo from "../assets/gcp.png"
export default function ResizableThreeColumn() {
  const [code, setCode] = useState("console.log('Hello, World!');")
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const chatEndRef = useRef(null)
  const codeExecutionTimeoutRef = useRef(null)
  const outputEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [output])

  const runCode = () => {
    setIsRunning(true)
    setOutput('')

    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const iframeWindow = iframe.contentWindow
    if (iframeWindow) {
      iframeWindow.console.log = (...args) => {
        setOutput(prev => prev + args.join(' ') + '\n')
      }

      try {
        const wrappedCode = `
          try {
            ${code}
          } catch (error) {
            console.log('Error:', error.message);
          }
        `
        codeExecutionTimeoutRef.current = setTimeout(() => {
          iframeWindow.eval(wrappedCode)
          document.body.removeChild(iframe)
          setIsRunning(false)
        }, 100)
      } catch (error) {
        setOutput(`Error: ${error.message}`)
        document.body.removeChild(iframe)
        setIsRunning(false)
      }
    }
  }

  const handleChatSubmit = async (e) => {
    e.preventDefault()
    if (userInput.trim()) {
      setChatMessages(prev => [...prev, { role: 'user', content: userInput }])
      
      try {
        const response = await fetch('http://localhost:8002/api/chat_response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: userInput }),
        });

        const data = await response.json();
        if (data.status_code === 200) {
          const chatResponse = data.result.replace(/\n/g, '<br>');
          setChatMessages(prev => [...prev, { role: 'bot', content: chatResponse }]);
        } else {
          console.error('Error fetching chat response:', data);
        }
      } catch (error) {
        console.error('Error fetching chat response:', error);
      }
      setUserInput('')
    }
  }

  const clearChat = () => {
    setChatMessages([])
  }

  const copySingleMessage = (message) => {
    const plainMessage = message.replace(/<br>/g, '\n');
    navigator.clipboard.writeText(plainMessage).then(() => {
      Toast({
        title: "Message copied",
        description: "The bot response has been copied to your clipboard.",
      })
    }).catch(err => {
      console.error('Failed to copy: ', err)
      Toast({
        title: "Copy failed",
        description: "Failed to copy the message. Please try again.",
        variant: "destructive",
      })
    })
  }

  const copyOutput = () => {
    navigator.clipboard.writeText(output).then(() => {
      Toast({
        title: "Output copied",
        description: "The output has been copied to your clipboard.",
      })
    }).catch(err => {
      console.error('Failed to copy: ', err)
      Toast({
        title: "Copy failed",
        description: "Failed to copy the output. Please try again.",
        variant: "destructive",
      })
    })
  }

  useEffect(() => {
    return () => {
      if (codeExecutionTimeoutRef.current) {
        clearTimeout(codeExecutionTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="h-[100%] bg-gray-100 pl-2 pr-2">
    <header className="bg-white p-3 flex justify-between items-center  rounded-lg h-[9%] ">
        <h1 className="text-2xl font-bold">JavaScript Code Playground</h1>
        <div className="flex items-center">
        <img src={mylogo} alt = "my-logo" className='w-12 h-12 rounded-full'></img> 
        </div>
      </header> 
      <ResizablePanelGroup direction="horizontal" className="rounded-lg border "  >
      
        {/* Chatbot Column */}
        <ResizablePanel defaultSize={33} className="flex flex-col">
          <Card className="flex-1 rounded-none border-0 flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Chatbot</CardTitle>
              <Button variant="ghost" size="icon" onClick={clearChat}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Clear chat</span>
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full w-full">
                <div className="flex flex-col p-4 h-full">
                  {chatMessages.map((message, index) => (
                    <div key={index} className={`mb-4 relative ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className="inline-block p-2 rounded-lg relative bg-gray-200 text-gray-800">
                        {/* Bot message */}
                        <span
                          className="block"
                          dangerouslySetInnerHTML={{ __html: message.content }}
                        />
                        {/* Copy button inside the bot message at the top-right */}
                        {message.role === 'bot' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copySingleMessage(message.content)}
                            className="absolute top-1 right-1"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Copy message</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <form onSubmit={handleChatSubmit} className="flex gap-2 w-full">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-grow"
                />
                <Button type="submit">
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </form>
            </CardFooter>
          </Card>
        </ResizablePanel>

        <ResizableHandle />

        {/* Code Executor Column */}
        <ResizablePanel defaultSize={34} className="flex flex-col">
          <Card className="flex-1 rounded-none border-0 flex flex-col">
            <CardHeader>
              <CardTitle>Code Executor</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your JavaScript code here..."
                className="font-mono h-full resize-none"
              />
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button 
                onClick={runCode} 
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  'Run Code'
                )}
              </Button>
            </CardFooter>
          </Card>
        </ResizablePanel>

        <ResizableHandle />

        {/* Output Column */}
        <ResizablePanel defaultSize={33} className="flex flex-col">
          <Card className="flex-1 rounded-none border-0 flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Output</CardTitle>
              <Button variant="ghost" size="icon" onClick={copyOutput}>
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy output</span>
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full w-full">
                
                <pre className="whitespace-pre-wrap font-mono p-4">
                  {output || 'Output will appear here...'}
                  <div ref={outputEndRef} />
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
      <header className="bg-white p-3 flex justify-between items-center  rounded-lg h-[7%] ">
        {/* <div className="flex justify-between items-center"> */}
          
          
        {/* </div> */}
      </header>
    </div>
    // </div>
  )
}
