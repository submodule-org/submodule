type HomeProps = {
  msg: string
}

export default function Home(props: HomeProps) {
  return <div>{props.msg}</div>
}

import { GetServerSideProps } from "next"
import { caller } from "../submodule.def"

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const result = await caller('hello', {})

  return {
    props: {
      msg: result.hello
    }
  }
}