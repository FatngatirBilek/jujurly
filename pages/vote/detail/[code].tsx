import { useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import ReactDatePicker, { registerLocale } from "react-datepicker";
import AddCandidateButton from "../../../components/AddCandidateButton";
import "react-datepicker/dist/react-datepicker.css";

import Button from "../../../components/Button";
import CandidateForm from "../../../components/CandidateForm";
import Form from "../../../components/Form";
import RestrictedPage from "../../../components/page/RestrictedPage";
import useVote from "../../../lib/useVote";
import id from "date-fns/locale/id";
import Link from "next/link";
import { showAlert } from "../../../components/Alert";
registerLocale("id", id);

export default function DetailOrEditVotes() {
  const router = useRouter();
  const { code } = router.query;
  const { vote, isLoading, isError } = useVote(code as string);

  const { data: session } = useSession();

  const [startDate, setStartDate] = useState(new Date()); // tanggal mulai
  const [endDate, setEndDate] = useState(new Date()); //tanggal selesai
  const [candidates, setCandidates] = useState<Candidate[]>([]); //list kandidat
  const [title, setTitle] = useState(""); //judul vote

  useEffect(() => {
    if (vote) {
      setTitle(vote.title);
      setStartDate(new Date(vote.startDateTime));
      setEndDate(new Date(vote.endDateTime));
      setCandidates(vote.candidates);
    }
  }, [vote]);

  //Jika user belum login, maka akan diarahkan ke halaman login
  if (!session) return <RestrictedPage />;

  const addCandidateForm = () => {
    const newCandidate: Candidate = {
      name: "",
      key: candidates.length + 1,
      title: "",
    };
    setCandidates([...candidates, newCandidate]);
  };

  const removeCandidateForm = (key: number) => {
    //remove candidate selected by key and re arrange the key order
    const newCandidates = candidates.filter(
      (candidate) => candidate.key !== key,
    );
    newCandidates.forEach((candidate, index) => {
      candidate.key = index + 1;
    });

    setCandidates(newCandidates);
  };

  const submitCandidate = (candidate: Candidate) => {
    setCandidates(
      candidates.map((c) => (c.key === candidate.key ? candidate : c)),
    );
  };

  const updateVote = () => {
    //Validasi
    if (title === "") {
      showAlert({ title: "Hmmh", subtitle: "Judul tidak boleh kosong" });
      return;
    }
    if (candidates.length < 2) {
      showAlert({ title: "Hmmh", subtitle: "Minimal ada 2 Opsi" });
      return;
    }
    if (startDate > endDate) {
      showAlert({
        title: "Hmmh",
        subtitle: "Tanggal mulai tidak boleh lebih besar dari tanggal selesai",
      });
      return;
    }
    if (candidates.some((c) => c.name === "")) {
      showAlert({ title: "Hmmh", subtitle: "Nama O tidak boleh kosong" });
      return;
    }

    //Mengirim data ke API
    fetch("/api/votes", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: code,
        title,
        startDate,
        endDate,
        //candidates with no votes
        candidates: candidates.map((c) => ({
          name: c.name,
          title: c.title,
          key: c.key,
        })),
        publisher: session.user.email,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        showAlert({ title: "Yay!", subtitle: "Vote berhasil diubah" });
      });
  };

  return (
    <div>
      <Head>
        <title>Jujurly - {vote?.title}</title>
      </Head>

      <div className="container mx-auto py-10">
        <Image
          src={"/images/vote.png"}
          alt="vote"
          width={200}
          height={200}
          objectFit="contain"
        />
        <h1 className="text-4xl font-bold ">Buat Voting Baru</h1>
        <h2 className="text-zinc-700 mt-3">
          Silahkan masukkan data yang dibutuhkan sebelum membuat vote online
        </h2>

        <form className="flex flex-col">
          {/* Detail Voting */}
          <div className="space-y-5">
            <h3 className="font-medium text-xl mt-10">Detail Voting</h3>
            <div className="flex flex-col">
              <label className="text-sm">Judul</label>
              <Form
                onChange={setTitle}
                value={title}
                placeholder="Contoh : Voting Calon Gubernur Sumatera Utara"
                className="w-1/2"
              />
            </div>
            <div className="flex flex-col w-2/3">
              <label className="text-sm">Kapan dimulai?</label>
              <div className="inline-flex">
                <ReactDatePicker
                  locale={"id"}
                  showTimeSelect
                  dateFormat="Pp"
                  selected={startDate}
                  minDate={new Date()}
                  onChange={(date) => date && setStartDate(date)}
                  className="w-full border bg-zinc-100 border-transparent py-2 px-3"
                />
                <span className="text-sm text-center p-3">sampai</span>
                <ReactDatePicker
                  locale={"id"}
                  dateFormat="Pp"
                  showTimeSelect
                  selected={endDate}
                  minDate={startDate}
                  onChange={(date) => date && setEndDate(date)}
                  className="w-full border bg-zinc-100 border-transparent py-2 px-3"
                />
              </div>
            </div>
            <div className="flex flex-col w-1/2">
              <label className="text-sm"></label>
            </div>
          </div>
          {/* End Detail Voting */}

          {/* Opsi */}
          <h3 className="font-medium text-xl mt-10">Opsi</h3>
          <div className="grid gap-4 grid-cols-4 mt-5">
            {candidates.map((candidate, index) => (
              <CandidateForm
                key={index}
                candidate={candidate}
                submitCandidate={submitCandidate}
                removeCandidateForm={removeCandidateForm}
              />
            ))}
            <AddCandidateButton onClick={addCandidateForm} />
          </div>
          {/* End Opsi */}

          {/* Kode */}
          <h3 className="font-medium text-xl mt-10">Kode</h3>
          <div className="bg-zinc-100 p-5">
            Undang pemilih dengan menggunakan kode
            <span className="bg-zinc-200 font-bold py-2 px-3">
              {vote?.code}
            </span>
            ,
            <p>
              Atau gunalan link berikut :{" "}
              <a
                href={`/participant/${vote?.code}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-blue-500"
              >
                Buka Link
              </a>
            </p>
          </div>
          {/* End Kode */}
          <div className="py-10 text-right">
            <Link href="/">
              <a className="text-sm mr-3 hover:text-zinc-500">Kembali</a>
            </Link>
            <Button text="Update Voting👍🏻" size="lg" onClick={updateVote} />
          </div>
        </form>
      </div>
    </div>
  );
}
