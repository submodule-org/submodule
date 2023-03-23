export default function({ config, services }) {
  console.log(JSON.stringify({ config, services }))
  return { config, services }
}