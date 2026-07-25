import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bot, Send, User, Loader2, Database, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface QueryResult {
  sql: string;
  columns?: string[];
  rows?: Record<string, any>[];
  totalRows?: number;
  error?: string;
}

interface ChatResponse {
  answer: string;
  queryResult: QueryResult | null;
  conversationHistory: Message[];
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<{ role: string; content: string; queryResult?: QueryResult | null }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/ai/ask", {
        question: userMessage,
        conversationHistory
      });
      const response: ChatResponse = await res.json();

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response.answer,
        queryResult: response.queryResult
      }]);
      setConversationHistory(response.conversationHistory);
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Error: ${error.message || "Failed to get response"}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatContent = (content: string) => {
    const parts = content.split(/(```sql[\s\S]*?```)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("```sql")) {
        const sql = part.replace(/```sql\n?/, "").replace(/```$/, "");
        return (
          <pre key={idx} className="bg-muted p-3 rounded-md overflow-x-auto text-sm my-2 border">
            <code className="text-foreground">{sql}</code>
          </pre>
        );
      }
      return <span key={idx} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6" />
          AI Database Assistant
        </h1>
        <p className="text-muted-foreground mt-1">
          Ask questions about your database in plain English
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Ask me anything about your database</p>
                  <p className="text-sm mt-2">Try questions like:</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>"Find the email for user sproson"</li>
                    <li>"How many active framers are on the Basic plan?"</li>
                    <li>"Show me the top 10 framers by sales"</li>
                    <li>"Which framers haven't logged in for 6 months?"</li>
                  </ul>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`flex-1 max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
                    <div className={`inline-block p-3 rounded-lg ${
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    }`}>
                      {msg.role === "user" ? (
                        <p>{msg.content}</p>
                      ) : (
                        <div className="text-sm">{formatContent(msg.content)}</div>
                      )}
                    </div>

                    {msg.queryResult && (
                      <div className="mt-3">
                        {msg.queryResult.error ? (
                          <Card className="border-destructive">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>Query Error: {msg.queryResult.error}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ) : msg.queryResult.rows && msg.queryResult.rows.length > 0 ? (
                          <Card>
                            <CardHeader className="py-2 px-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                Results ({msg.queryResult.totalRows} rows)
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              <div className="max-h-[300px] overflow-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      {msg.queryResult.columns?.map((col, i) => (
                                        <TableHead key={i} className="text-xs">{col}</TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {msg.queryResult.rows?.slice(0, 20).map((row, i) => (
                                      <TableRow key={i}>
                                        {msg.queryResult!.columns?.map((col, j) => (
                                          <TableCell key={j} className="text-xs py-1">
                                            {row[col]?.toString() || "-"}
                                          </TableCell>
                                        ))}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              {msg.queryResult.rows && msg.queryResult.rows.length > 20 && (
                                <p className="text-xs text-muted-foreground p-2 text-center">
                                  Showing 20 of {msg.queryResult.totalRows} rows
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ) : (
                          <Card>
                            <CardContent className="p-3 text-sm text-muted-foreground">
                              Query returned no results
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <Textarea
              data-testid="input-ai-question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your database..."
              className="min-h-[60px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              data-testid="button-send-question"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
