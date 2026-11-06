from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from services import llm

class AgentState(TypedDict):
    text: str
    mode: str
    draft: str
    critique: str
    final_output: str

def generator_agent(state: AgentState):
    prompt = f"Write the best {state['mode']} response for: {state['text']}. Keep it strictly professional and concise."
    res = llm.invoke(prompt).content
    return {"draft": res}

def critic_agent(state: AgentState):
    # AGAR CHAT YA IMAGE HAI TOH DIRECT NIKAL DO (No check)
    if state["mode"] in ["chat", "image"]:
        return {"final_output": state["draft"]}
        
    # AGAR CODE CHOTA HAI (1000 characters se kam), TOH CHECK SKIP KARO (Fast)
    if len(state["draft"]) < 1000:
        return {"final_output": state["draft"]}
        
    # SIRF LAMBE CODE KO CHECK KARO
    prompt = f"Review this code. If it is perfect, reply exactly 'PASS' followed by the code. If not, fix it. Draft: {state['draft']}"
    res = llm.invoke(prompt).content
    return {"final_output": res}

builder = StateGraph(AgentState)
builder.add_node("generate", generator_agent)
builder.add_node("critique", critic_agent)
builder.add_edge(START, "generate")
builder.add_edge("generate", "critique")
builder.add_edge("critique", END)
agent_graph = builder.compile()