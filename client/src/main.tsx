import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import App from "./App"
import "./index.css" 


const queryClient=new QueryClient();
const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element not found");
ReactDOM.createRoot(rootElement!).render(
            <React.StrictMode>          
           <QueryClientProvider client={queryClient}>
             <BrowserRouter> 
               <App />
             </BrowserRouter>  {/*easy access to differnt urls in app without refresh*/}
           </QueryClientProvider> {/*acess memory/cache in whole app*/}
         </React.StrictMode>  //doublecheck code and look for bad practice*/
       )
