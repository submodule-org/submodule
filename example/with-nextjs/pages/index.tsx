import { GetServerSideProps } from "next"
import { Todo } from "../server/services/todo.service"
import { caller } from "../server/submodule"

type HomeProps = {
  todos: Todo[]
}

export default function Home(props: HomeProps) {
  return <div>{JSON.stringify(props.todos, undefined, 2)}</div>
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  return {
    props: {
      todos: await caller('listTodo', undefined)
    }
  }
}