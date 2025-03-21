import { Context, Schema } from "koishi";

export const name = "speak";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

type GuessRecord = {
  name: string;
  trans?: string[];
  inputting?: string[];
};

function transArrange(trans: string[]) {
  return trans.map((tran) => {
    const match = tran.match(/^(.+?)([（\(](.+?)[）\)])?$/);
    if (match.length === 4) {
      return {
        text: match[1],
        sub: match[3],
      };
    } else {
      return {
        text: tran,
      };
    }
  });
}

const cache = new Map<string, GuessRecord[]>();
async function guess(text: string): Promise<GuessRecord[]> {
  text = text.match(/[a-z0-9]{2,}/gi).join(",");
  if (cache.has(text)) {
    return cache.get(text)!;
  }
  const res = await (
    await fetch("https://lab.magiconch.com/api/nbnhhsh/guess", {
      method: "POST",
      body: JSON.stringify({ text }),
      headers: { "Content-Type": "application/json" },
    })
  ).json();
  cache.set(text, res);
  return res;
}

function join<T>(arr: T[], sep: T): T[] {
  if (arr.length < 2) return [...arr];
  const result: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(arr[i]);
    if (i < arr.length - 1) result.push(sep);
  }
  return result;
}

export function apply(ctx: Context) {
  ctx.command("speak <text:text>").action(async (_, text) => {
    if (!text || !/[a-z0-9]/i.test(text)) return "请输入正确的文本";
    const tags = await guess(text);
    if (!tags.length) return "尚未录入该词";
    return tags.map((tag) => {
      if (tag.trans) {
        return (
          <p>
            {tag.name}: {tag.trans.length > 1 ? <br /> : ""}
            {join(
              transArrange(tag.trans).map((tran) =>
                tran.sub ? (
                  <>
                    ${tran.text} <sub>${tran.sub}</sub>`
                  </>
                ) : (
                  <>{tran.text}</>
                )
              ),
              <br />
            )}
          </p>
        );
      }
      if (tag.inputting && tag.inputting.length > 0) {
        return (
          <p>
            {tag.name} 可能为: {tag.inputting.length > 1 ? <br /> : ""}
            {join(tag.inputting, <br />)}
          </p>
        );
      }
      return <p>{tag.name}: 尚未录入该词</p>;
    });
  });
}
